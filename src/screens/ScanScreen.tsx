import { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentPosition, checkPublicHoliday } from '../lib/geolocation';
import { ParkingAnalysis } from '../types';
import { AppHeader } from '../components/layout/AppHeader';
import { AppScreenShell } from '../components/layout/AppScreenShell';

interface ScanScreenProps {
  onAnalysisComplete: (analysis: ParkingAnalysis) => void;
}

type ScanState = 'idle' | 'captured' | 'locating' | 'analyzing' | 'error';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

      const imageBase64 = await fileToBase64(capturedFile);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      const dayStr = DAY_NAMES[now.getDay()];

      const { data: fnData, error: fnError } = await supabase.functions.invoke('analyze-parking', {
        body: {
          imageBase64,
          mimeType: capturedFile.type,
          currentTime: timeStr,
          currentDay: dayStr,
          isPublicHoliday: isHoliday,
          location: locationStr,
        },
      });

      if (fnError) {
        const detail = await extractEdgeFunctionError(fnError);
        const isKeyMissing = detail.toLowerCase().includes('openrouter_api_key') || detail.toLowerCase().includes('not configured');
        throw new Error(
          isKeyMissing
            ? 'OPENROUTER_API_KEY not configured.\nAdd it in: Supabase Dashboard → Edge Functions → Secrets → New secret'
            : detail
        );
      }

      if (fnData?.error) {
        throw new Error(fnData.error);
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
      const msg = err instanceof Error ? err.message : 'Analysis failed. Please try again.';
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
    <AppScreenShell>
      <AppHeader />

        <section className="p-5 space-y-4">
      {/* Landing Screen - Idle State */}
      {scanState === 'idle' && (
        <>
          {/* Hero Card */}
          <div className="bg-primary-fixed-dim rounded-xl p-xl border border-primary-container">
            <h2 className="text-display-status-mobile font-extrabold text-primary mb-md">Can I Park Here?</h2>
            <p className="text-body-lg text-on-surface mb-xl">
              Upload or snap a photo of the nearby parking sign. Our AI engine analyzes local regulations in real-time for instant clarity.
            </p>

            {/* Action Buttons */}
            <div className="space-y-md">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full bg-primary text-on-primary py-4 rounded-lg flex items-center justify-center gap-md text-headline-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>photo_camera</span>
                Scan Parking Sign
              </button>
              <button
                onClick={() => uploadInputRef.current?.click()}
                className="w-full bg-surface-container-lowest text-on-surface py-4 rounded-lg flex items-center justify-center gap-md text-headline-sm font-semibold hover:bg-surface-container-low active:scale-95 transition-all border border-outline-variant"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>upload_file</span>
                Upload Image
              </button>
            </div>
          </div>

          {/* Current Status Card */}
          <div className="bg-surface-container-lowest rounded-xl p-lg border border-outline-variant shadow-sm mt-xs">
            <p className="text-label-sm text-on-surface-variant font-semibold mb-md">Current Status</p>
            <p className="text-display-status-mobile font-extrabold text-primary mb-xs">{timeStr}</p>
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
                    className="w-full h-48 object-cover"
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
                  className="w-full h-48 flex flex-col items-center justify-center gap-md bg-surface-container-low hover:bg-surface-container transition-colors border-2 border-dashed border-outline-variant"
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
            <div className="bg-error-container border border-error/30 rounded-xl p-md flex items-start gap-md mb-lg">
              <span className="material-symbols-outlined text-on-error-container mt-0.5 flex-shrink-0">error</span>
              <div className="flex-1 min-w-0">
                <p className="text-label-lg font-semibold text-on-error-container">{errorMessage}</p>
                {errorDetail && (
                  <p className="text-label-sm text-on-error-container/80 mt-xs whitespace-pre-line">{errorDetail}</p>
                )}
              </div>
            </div>
          )}

          {/* Analyze / retry button */}
          {(scanState === 'captured' || scanState === 'error') && (
            <button
              onClick={handleAnalyze}
              disabled={isProcessing}
              className="w-full bg-primary py-4 rounded-lg flex items-center justify-center gap-md text-on-primary text-headline-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all shadow-lg disabled:opacity-70"
            >
              <span className="material-symbols-outlined">search</span>
              {scanState === 'error' ? 'Try Again' : 'Analyze Sign'}
            </button>
          )}
        </>
      )}
        </section>
    </AppScreenShell>
  );
}
