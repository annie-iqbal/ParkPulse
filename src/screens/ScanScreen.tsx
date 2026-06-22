import { useRef, useState, useEffect } from 'react';
import { supabaseAnonKey, supabaseUrl } from '../lib/supabase';
import { getCurrentPosition, checkPublicHoliday } from '../lib/geolocation';
import { ParkingAnalysis } from '../types';
import { AppHeader } from '../components/layout/AppHeader';
import { AppScreenShell } from '../components/layout/AppScreenShell';

interface ScanScreenProps {
  onAnalysisComplete: (analysis: ParkingAnalysis) => void;
}

type ScanState = 'idle' | 'captured' | 'locating' | 'analyzing' | 'error';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ANALYZE_FUNCTION_NAME = 'analyze-parking';
const MAX_ANALYZE_IMAGE_SIZE = 1600;
const ANALYZE_IMAGE_QUALITY = 0.82;

interface AnalyzeFunctionResponse {
  canPark?: boolean;
  verdict?: string;
  description?: string;
  maxDuration?: string | null;
  until?: string | null;
  contextCards?: ParkingAnalysis['contextCards'];
  regulatoryBreakdown?: ParkingAnalysis['regulatoryBreakdown'];
  rawSignText?: string;
  error?: string;
}

async function extractEdgeFunctionError(error: unknown): Promise<string> {
  if (!error) return 'Unknown error';
  const err = error as { message?: string; context?: Response };
  // Try to read the actual JSON body from the edge function response
  if (err.context && typeof err.context.json === 'function') {
    try {
      const body = await err.context.json();
      if (body?.error) return body.error;
    } catch {
      // ignore parse errors
    }
    try {
      const text = await err.context.text?.();
      if (text) return text;
    } catch {
      // ignore
    }
  }
  return err.message ?? 'Edge function call failed.';
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function imageFileToAnalyzePayload(file: File): Promise<{ imageBase64: string; mimeType: string }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();

    const scale = Math.min(1, MAX_ANALYZE_IMAGE_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare image for analysis.');
    context.drawImage(image, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', ANALYZE_IMAGE_QUALITY);
    return { imageBase64: dataUrl.split(',')[1], mimeType: 'image/jpeg' };
  } catch {
    return { imageBase64: await fileToBase64(file), mimeType: file.type || 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function invokeAnalyzeParking(body: Record<string, unknown>): Promise<AnalyzeFunctionResponse> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured.\nAdd VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your local environment.');
  }

  const functionUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${ANALYZE_FUNCTION_NAME}`;
  let response: Response;

  try {
    response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `Could not reach the ${ANALYZE_FUNCTION_NAME} Edge Function.\nDeploy the latest function with: supabase functions deploy ${ANALYZE_FUNCTION_NAME}\nIf it is already deployed, check that VITE_SUPABASE_URL points to the same Supabase project.`
    );
  }

  const responseText = await response.text();
  let data: AnalyzeFunctionResponse = {};
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: responseText };
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Analyze function failed with HTTP ${response.status}.`);
  }

  return data;
}

export function ScanScreen({ onAnalysisComplete }: ScanScreenProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [currentLocation, setCurrentLocation] = useState('Getting location...');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('parkwise_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      setDarkMode(settings.darkMode ?? false);
    }

    const handleDarkModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      setDarkMode(customEvent.detail);
    };

    window.addEventListener('darkModeToggled', handleDarkModeChange);
    return () => window.removeEventListener('darkModeToggled', handleDarkModeChange);
  }, []);

  useEffect(() => {
    // Load current location on mount
    getCurrentPosition()
      .then(pos => setCurrentLocation(pos.address))
      .catch(() => setCurrentLocation('Your Location'));
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    const url = URL.createObjectURL(file);
    setCapturedImage(url);
    setScanState('captured');
    setErrorMessage('');
    setErrorDetail('');
  }

  function handleRetake() {
    setCapturedImage(null);
    setCapturedFile(null);
    setScanState('idle');
    setErrorMessage('');
    setErrorDetail('');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  }

  async function handleAnalyze() {
    if (!capturedFile) return;
    setErrorMessage('');
    setErrorDetail('');

    try {
      setScanState('locating');
      setStatusMessage('Getting your location...');

      let locationStr = 'Unknown location';
      let isHoliday = false;

      try {
        const [pos, holiday] = await Promise.all([
          getCurrentPosition(),
          checkPublicHoliday('AU'),
        ]);
        locationStr = pos.address;
        isHoliday = holiday;
      } catch {
        // Non-fatal — continue without location
      }

      setScanState('analyzing');
      setStatusMessage('Reading the sign with AI...');

      const imagePayload = await imageFileToAnalyzePayload(capturedFile);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      const dayStr = DAY_NAMES[now.getDay()];

      const fnData = await invokeAnalyzeParking({
        imageBase64: imagePayload.imageBase64,
        mimeType: imagePayload.mimeType,
        currentTime: timeStr,
        currentDay: dayStr,
        isPublicHoliday: isHoliday,
        location: locationStr,
      });

      if (fnData?.error) {
        const isKeyMissing = fnData.error.toLowerCase().includes('openrouter_api_key') || fnData.error.toLowerCase().includes('not configured');
        throw new Error(
          isKeyMissing
            ? 'OPENROUTER_API_KEY not configured.\nAdd it in: Supabase Dashboard → Edge Functions → Secrets → New secret'
            : fnData.error
        );
      }

      const analysis: ParkingAnalysis = {
        canPark: fnData.canPark ?? false,
        verdict: fnData.verdict ?? (fnData.canPark ? 'YES, YOU CAN PARK' : 'NO PARKING'),
        description: fnData.description ?? '',
        maxDuration: fnData.maxDuration ?? undefined,
        until: fnData.until ?? undefined,
        contextCards: fnData.contextCards ?? [],
        regulatoryBreakdown: fnData.regulatoryBreakdown ?? [],
        location: locationStr,
        analysisTime: `Today, ${timeStr}`,
        rawSignText: fnData.rawSignText,
      };

      onAnalysisComplete(analysis);
    } catch (err) {
      setScanState('error');
      const msg = err instanceof Error ? await extractEdgeFunctionError(err) : 'Analysis failed. Please try again.';
      const lines = msg.split('\n');
      setErrorMessage(lines[0]);
      setErrorDetail(lines.slice(1).join('\n'));
    }
  }

  const isProcessing = scanState === 'locating' || scanState === 'analyzing';

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <AppScreenShell darkMode={darkMode}>
      <AppHeader darkMode={darkMode} />

        <section className="p-5 space-y-4">
      {/* Landing Screen - Idle State */}
      {scanState === 'idle' && (
        <>
          {/* Hero Card */}
          <div className={`rounded-[10px] border px-6 py-7 shadow-sm ${darkMode ? 'border-[#555] bg-[#2a2a2a]' : 'border-[#CDBFB4] bg-[#F8F1EC]/80'}`}>
            <h2 className={`text-[24px] leading-[1.15] font-semibold mb-3 ${darkMode ? 'text-[#ff9800]' : 'text-[#D97706]'}`}>Can I Park Here?</h2>
            <p className={`text-[15px] leading-[1.45] mb-12 ${darkMode ? 'text-[#d6d0ca]' : 'text-[#5A4A40]'}`}>
              Upload or snap a photo of the nearby parking sign. Our AI engine analyzes local regulations in real-time for instant clarity.
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className={`w-full h-[56px] rounded-[8px] text-white flex items-center justify-center gap-3 text-[15px] font-semibold tracking-[0.02em] shadow-[0_8px_14px_rgba(69,26,3,0.18)] active:scale-[0.99] transition-all ${darkMode ? 'bg-[#ff9800] hover:bg-[#E88816]' : 'bg-[#D97706] hover:bg-[#C96A05]'}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>photo_camera</span>
                Scan Parking Sign
              </button>
              <button
                onClick={() => uploadInputRef.current?.click()}
                className={`w-full h-[56px] rounded-[8px] flex items-center justify-center gap-3 text-[15px] font-semibold tracking-[0.02em] border active:scale-[0.99] transition-all ${darkMode ? 'border-[#7A4A12] bg-[#3a2a18] text-[#ffd7a3] hover:bg-[#45311c]' : 'border-[#D9B995] bg-[#F7D9B8] text-[#2A1E17] hover:bg-[#F3CFA5]'}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '22px', fontVariationSettings: "'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}>upload_file</span>
                Upload Image
              </button>
            </div>
          </div>

          {/* Current Status Card */}
          <div className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant shadow-sm mt-xs">
            <p className="text-label-sm text-on-surface-variant font-semibold mb-md">Current Status</p>
            <p className="text-display-status-mobile font-extrabold text-[#D97706] mb-xs">{timeStr}</p>
            <p className="text-label-lg text-on-surface-variant mb-lg">{dateStr}</p>
            <div className="flex items-center gap-md pt-lg border-t border-outline-variant">
              <div className="w-10 h-10 rounded-lg bg-primary-fixed-dim flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary">location_on</span>
              </div>
              <p className="text-label-lg text-on-surface font-medium">{currentLocation}</p>
            </div>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}

      {/* Capture Preview & Analysis Flow */}
      {scanState !== 'idle' && (
        <>
          {/* Camera / Preview area */}
          <div className="bg-white rounded-xl border border-outline-variant shadow-sm overflow-hidden mb-lg">
            <div className="relative">
              {capturedImage ? (
                <div className="relative">
                  <img
                    src={capturedImage}
                    alt="Captured parking sign"
                    className="w-full h-[70vh] min-h-[420px] max-h-[720px] object-contain bg-black"
                  />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-md">
                      <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      <p className="text-white font-label-lg">{statusMessage}</p>
                    </div>
                  )}
                  {(scanState === 'captured' || scanState === 'error') && (
                    <button
                      onClick={handleRetake}
                      className="absolute top-md right-md bg-black/50 text-white rounded-full px-md py-xs text-label-lg font-medium flex items-center gap-xs hover:bg-black/70 transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span>
                      Retake
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full h-[70vh] min-h-[420px] max-h-[720px] flex flex-col items-center justify-center gap-md bg-surface-container-low hover:bg-surface-container transition-colors border-2 border-dashed border-outline-variant"
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: '40px' }}>
                      photo_camera
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-headline-sm font-semibold text-on-surface">Take a Photo</p>
                    <p className="text-on-surface-variant text-label-lg mt-xs">Tap to open your camera</p>
                  </div>
                </button>
              )}
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Error state */}
          {scanState === 'error' && (
            <div className="bg-error-container border border-error/30 rounded-xl p-md flex items-start gap-md mb-lg max-h-[220px] overflow-hidden">
              <span className="material-symbols-outlined text-on-error-container mt-0.5 flex-shrink-0">error</span>
              <div className="flex-1 min-w-0 max-h-[180px] overflow-y-auto overscroll-contain pr-2">
                <p className="text-label-lg font-semibold text-on-error-container break-words">{errorMessage}</p>
                {errorDetail && (
                  <p className="text-label-sm text-on-error-container/80 mt-xs whitespace-pre-line break-words">{errorDetail}</p>
                )}
              </div>
            </div>
          )}

          {/* Analyze / retry button */}
          {(scanState === 'captured' || scanState === 'error') && (
            <button
              onClick={handleAnalyze}
              disabled={isProcessing}
              className="w-full h-[50px] rounded-[10px] bg-[#D97706] text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_18px_rgba(69,26,3,0.22)] active:scale-[0.99] transition-transform tracking-[0.02em] disabled:opacity-50"
            >
              {scanState === 'error' ? 'Try Again' : 'Analyze Sign'}
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
            </button>
          )}
        </>
      )}
        </section>
    </AppScreenShell>
  );
}
