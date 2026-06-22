import { useEffect, useMemo, useState, useRef } from 'react';
import {
  Camera,
  CircleDollarSign,
  Upload,
  WifiOff,
  ChevronRight,
  CircleOff,
  X,
} from 'lucide-react';
import { getCurrentPosition } from '../lib/geolocation';
import { supabase } from '../lib/supabase';
import { getReminderSettings } from '../lib/reminderSettings';

interface MarkSpotScreenProps {
  onConfirm?: (sessionId: string) => void;
}

type LocationState = 'loading' | 'ready' | 'offline';

const STORAGE_BUCKET = 'parking-images';
const DURATION_OPTIONS = [5, 10, 30, 60, 120, 180, 240, 300, 1440];

function formatTimeOption(minutes: number): string {
  if (minutes === 1440) return 'Full day';
  if (minutes < 60) return `${minutes}m`;
  return `${minutes / 60} hour${minutes === 60 ? '' : 's'}`;
}

function ensurePublicStorageUrl(url: string): string {
  if (url.includes('/storage/v1/object/public/')) {
    return url;
  }

  if (url.includes('/storage/v1/object/')) {
    return url.replace('/storage/v1/object/', '/storage/v1/object/public/');
  }

  return url;
}

function buildOpenStreetMapEmbedUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${(lng - 0.005).toFixed(4)},${(lat - 0.005).toFixed(4)},${(lng + 0.005).toFixed(4)},${(lat + 0.005).toFixed(4)}&layer=mapnik&marker=${lat},${lng}`;
}

export function MarkSpotScreen({ onConfirm }: MarkSpotScreenProps) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [locationState, setLocationState] = useState<LocationState>('loading');
  const [address, setAddress] = useState('Locating your parking spot...');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentDueInput, setPaymentDueInput] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [capturedImage, setCapturedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function locate() {
      if (!isOnline) {
        if (!mounted) return;
        setLocationState('offline');
        setAddress('Manual entry required');
        return;
      }

      setLocationState('loading');

      try {
        const position = await getCurrentPosition();
        if (!mounted) return;
        setAddress(position.address || `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`);
        setLat(position.lat);
        setLng(position.lng);
        setLocationState('ready');
      } catch {
        if (!mounted) return;
        setLocationState('offline');
        setAddress('Unable to detect location automatically');
        setLat(null);
        setLng(null);
      }
    }

    locate();

    return () => {
      mounted = false;
    };
  }, [isOnline]);

  useEffect(() => {
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const isOfflineMode = !isOnline || locationState === 'offline';
  const maxChars = isOfflineMode ? 200 : 150;

  const liveMapEmbedUrl = useMemo(() => {
    if (lat === null || lng === null) return null;
    return buildOpenStreetMapEmbedUrl(lat, lng);
  }, [lat, lng]);

  async function handleConfirmSpot() {
    if (isSaving) return;

    setIsSaving(true);

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);
    const reminderSettings = getReminderSettings();
    if (reminderSettings.enabled && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    const paymentDue = Number.parseFloat(paymentDueInput);
    const locationText =
      locationState === 'ready' && address
        ? address
        : description.trim() || 'Manual parking spot';

    const spotNote = description.trim();

    let imageUrl: string | null = null;

    // Upload image if captured
    if (capturedImage) {
      try {
        const extension = capturedImage.type.includes('png') ? 'png' : 'jpg';
        const fileName = `parking-spots/${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${extension}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(fileName, capturedImage, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }

        if (!uploadData) {
          throw new Error('Upload failed without a file path.');
        }

        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(fileName);

        const publicUrl = urlData?.publicUrl;
        if (!publicUrl) {
          throw new Error('Could not generate public image URL.');
        }

        imageUrl = ensurePublicStorageUrl(publicUrl);
      } catch (error) {
        console.error('Image upload failed:', error);
        setIsSaving(false);
        const message = error instanceof Error ? error.message : 'Unknown upload error';
        if (message.toLowerCase().includes('bucket not found')) {
          alert('Image storage is not set up yet. Please apply the Supabase migration that creates the parking-images bucket, then try again.');
        } else {
          alert(`Image upload failed: ${message}`);
        }
        return;
      }
    }

    // Cancel any active sessions
    await supabase
      .from('parking_sessions')
      .update({ status: 'cancelled', ended_at: startedAt.toISOString() })
      .eq('status', 'active');

    // Build insert object with only defined values to avoid 400 errors
    const insertData: Record<string, unknown> = {
      location: locationText,
      zone: '',
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      reminder_enabled: reminderSettings.enabled,
      status: 'active',
      payment_due: isPaid && Number.isFinite(paymentDue) ? paymentDue : 0,
    };

    // Only add optional fields if they have values
    if (lat !== null) insertData.lat = lat;
    if (lng !== null) insertData.lng = lng;
    if (spotNote) insertData.spot_note = spotNote;
    if (imageUrl) insertData.image_url = imageUrl;

    const primaryInsert = await supabase
      .from('parking_sessions')
      .insert(insertData)
      .select('id')
      .single();

    let data = primaryInsert.data;
    let error = primaryInsert.error;

    if (error) {
      // Fallback: try without optional fields
      const fallbackData: Record<string, unknown> = {
        location: locationText,
        zone: '',
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        reminder_enabled: reminderSettings.enabled,
        status: 'active',
      };

      if (lat !== null) fallbackData.lat = lat;
      if (lng !== null) fallbackData.lng = lng;

      const fallbackInsert = await supabase
        .from('parking_sessions')
        .insert(fallbackData)
        .select('id')
        .single();

      data = fallbackInsert.data;
      error = fallbackInsert.error;
    }

    setIsSaving(false);

    if (!error && data?.id) {
      onConfirm?.(data.id);
    }
  }

  async function startCameraStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      alert('Unable to access camera. Please check permissions.');
    }
  }

  async function handleTakePhoto() {
    setCameraPreview(null);
    setCameraActive(true);
    await startCameraStream();
  }

  function handleCapturePhoto() {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `parking-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setCapturedImage(file);
            const preview = URL.createObjectURL(blob);
            setCameraPreview(preview);

            const stream = videoRef.current?.srcObject as MediaStream;
            stream?.getTracks().forEach((track) => track.stop());
          }
        }, 'image/jpeg', 0.95);
      }
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setCapturedImage(file);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
    }
  }

  function handleRemoveImage() {
    setCapturedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleCloseCamera() {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach((track) => track.stop());
    if (cameraPreview) {
      URL.revokeObjectURL(cameraPreview);
      setCameraPreview(null);
    }
    setCameraActive(false);
  }

  async function handleRetakePhoto() {
    if (cameraPreview) {
      URL.revokeObjectURL(cameraPreview);
    }
    setCameraPreview(null);
    await startCameraStream();
  }

  function handleUseCapturedPhoto() {
    if (!cameraPreview) return;

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImagePreview(cameraPreview);
    setCameraPreview(null);
    setCameraActive(false);
  }

  // Camera modal when active
  if (cameraActive) {
    return (
      <main className="fixed inset-0 z-50 bg-black overflow-hidden">
        <div className="h-full flex flex-col">
        <div className="relative flex-1 min-h-0 overflow-hidden bg-black">
          {cameraPreview ? (
            <img src={cameraPreview} alt="Captured preview" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <h2 className="text-white text-[20px] font-semibold">Capture Parking Spot</h2>
            <button
              onClick={handleCloseCamera}
              className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="bg-black/90 border-t border-gray-700 p-6 flex gap-3 justify-center shrink-0">
          {cameraPreview ? (
            <>
              <button
                onClick={handleRetakePhoto}
                className="flex-1 h-14 rounded-lg border border-gray-500 text-white text-[16px] font-semibold bg-transparent hover:bg-gray-900 transition-colors"
              >
                Retake Photo
              </button>
              <button
                onClick={handleUseCapturedPhoto}
                className="flex-1 h-14 rounded-lg bg-[#D97706] text-white text-[16px] font-semibold hover:bg-[#C26A05] transition-colors"
              >
                Use Photo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCapturePhoto}
                className="flex-1 h-14 rounded-lg bg-[#D97706] text-white text-[16px] font-semibold hover:bg-[#C26A05] transition-colors"
              >
                Capture Photo
              </button>
              <button
                onClick={handleCloseCamera}
                className="flex-1 h-14 rounded-lg border border-gray-500 text-white text-[16px] font-semibold bg-transparent hover:bg-gray-900 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>

        <div className="border-t border-[#D7CCC2] h-[74px] bg-[#F4F0EC] px-6 flex items-center justify-between shrink-0">
          <button
            onClick={onHomeClick}
            className="flex flex-col items-center justify-center text-[#4B3A31] min-w-[56px]"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
            <span className="text-[12px] mt-0.5">Home</span>
          </button>

          <button
            onClick={onParkClick}
            className="w-[56px] h-[56px] rounded-full bg-[#D97706] text-white flex flex-col items-center justify-center"
          >
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24" }}>
              local_parking
            </span>
            <span className="text-[12px] leading-none">Park</span>
          </button>

          <button
            onClick={onCheckClick}
            className="flex flex-col items-center justify-center text-[#4B3A31] min-w-[56px]"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
            <span className="text-[12px] mt-0.5">Check</span>
          </button>

          <button
            onClick={onSettingsClick}
            className="flex flex-col items-center justify-center text-[#4B3A31] min-w-[56px]"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="text-[12px] mt-0.5">Settings</span>
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-grow w-full max-w-[600px] mx-auto px-3 sm:px-4 pt-4 pb-28 bg-[#EEE8E2]">
      <div className="mx-auto w-full max-w-[540px] rounded-[20px] border border-[#D6CBC2] bg-[#F3EEEA] shadow-[0_4px_22px_rgba(28,25,23,0.12)] overflow-hidden">
        <header className="h-[62px] px-4 sm:px-5 border-b border-[#D7CCC2] flex items-center justify-between bg-[#F4F0EC]">
          <div className="flex items-center gap-2 text-[#D97706]">
            <span className="material-symbols-outlined text-[22px]">menu</span>
            <span className="text-[34px] leading-none font-bold">P</span>
            <span className="-ml-1.5 text-[33px] leading-none font-semibold">arkPulse</span>
          </div>

          <div className="w-10 h-10 rounded-full border-2 border-[#D97706]/45 bg-[#1C1917] grid place-items-center text-[#FDE68A]">
            <span className="material-symbols-outlined text-[20px]">person</span>
          </div>
        </header>

        {isOfflineMode && (
          <div className="bg-[#F2B79D] border-b border-[#E9A88A] px-4 py-2.5 text-[#6A2D17] flex items-start gap-2">
            <WifiOff size={16} className="mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold leading-tight">No internet connection. Manual entry required.</p>
              <p className="text-[12px] opacity-80">Your data will sync once you're back online.</p>
            </div>
          </div>
        )}

        <section className="p-4 sm:p-5 space-y-4">
          {!isOfflineMode && (
            <>
              <div>
                <h2 className="text-[38px] font-semibold text-[#271E1B] leading-[1.05]">Mark Your Spot</h2>
                <p className="mt-2 text-[15px] text-[#5F514A] leading-[1.35]">
                  Ensure you find your car easily later by providing precise details.
                </p>
              </div>

              <div className="rounded-[10px] border border-[#CDBFB4] overflow-hidden bg-[#F7F4F1]">
                <div className="p-3 pb-0">
                  <span className="inline-flex items-center gap-1.5 bg-[#D97706] text-white text-[11px] font-semibold tracking-wide px-3 py-1 rounded-full">
                    ◎ LIVE LOCATION
                  </span>
                </div>

                <div className="relative m-3 mt-2 h-[248px] rounded-[10px] overflow-hidden bg-gradient-to-br from-[#E8F0F8] to-[#D0E0F0]">
                  {liveMapEmbedUrl ? (
                    <iframe
                      title="Live parking location map"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src={liveMapEmbedUrl}
                      className="absolute inset-0"
                    />
                  ) : (
                    <>
                      <div className="absolute inset-0 opacity-50" style={{
                        backgroundImage:
                          'linear-gradient(0deg, rgba(200,200,200,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,200,200,0.3) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                      }} />
                      <div className="absolute inset-0 grid place-items-center px-5 text-center text-[14px] font-semibold text-[#6C5D54]">
                        {locationState === 'loading' ? 'Loading live map...' : 'Location map unavailable'}
                      </div>
                    </>
                  )}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#D97706] border-2 border-white shadow-lg pointer-events-none" />
                </div>

                <div className="px-4 pb-4">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.08em] text-[#D97706]">DETECTED ADDRESS</p>
                    <p className="text-[17px] font-semibold leading-tight text-[#2A1E17] mt-0.5">
                      {locationState === 'loading' ? 'Detecting your address...' : address}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {isOfflineMode && (
            <div className="rounded-[10px] border border-[#CDBFB4] bg-[#F5F1EE] p-5 text-center">
              <div className="w-20 h-20 rounded-xl bg-white shadow-sm mx-auto grid place-items-center text-[#8D4F00] mb-4">
                <CircleOff size={34} />
              </div>
              <h3 className="text-[38px] leading-tight font-semibold text-[#2A1E17]">GPS Unavailable</h3>
              <p className="mt-2 text-[15px] text-[#5A4B42] leading-[1.35]">
                We can't pinpoint your exact location right now. Please describe your spot below.
              </p>
            </div>
          )}

          <div className="rounded-[10px] border border-[#CDBFB4] p-4 bg-[#F8F5F2]">
            <label className="text-[13px] font-semibold tracking-[0.08em] text-[#4A3D35] uppercase block mb-2">
              Parking Description *
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, maxChars))}
              placeholder={isOfflineMode ? 'e.g. Level 3, near elevator B, Section 4A...' : 'e.g. Level 3, Blue Zone, Near Pillar B4...'}
              className="w-full min-h-[112px] rounded-[8px] border border-[#D3C5BB] bg-[#F6F1EE] px-4 py-3 text-[15px] text-[#3F312A] placeholder:text-[#8B7A70] resize-none outline-none focus:border-[#D97706]/60"
            />
            <div className="mt-2 flex justify-end text-[12px] font-semibold text-[#6C5D54]">
              {description.length}/{maxChars}
            </div>
          </div>

          <div className="rounded-[10px] border border-[#CDBFB4] p-4 bg-[#F8F5F2] space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#4A3D35]">
                  <CircleDollarSign size={18} className="text-[#8F4700]" />
                  <span className="text-[13px] font-semibold tracking-[0.08em] uppercase">Is Paid</span>
                </div>
                <button
                  onClick={() => setIsPaid((value) => !value)}
                  className={`relative shrink-0 w-[54px] h-[30px] rounded-full transition-colors ${isPaid ? 'bg-[#C46905]' : 'bg-[#C8BDB5]'}`}
                  aria-pressed={isPaid}
                  aria-label="Toggle paid status"
                >
                  <span className={`absolute left-[3px] top-[3px] w-6 h-6 rounded-full bg-white shadow transition-transform ${isPaid ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              {isPaid && (
                <div className="mt-2 h-11 rounded-[8px] border border-[#D3C5BB] bg-[#F6F1EE] px-3 flex items-center gap-2">
                  <span className="text-[#8F4700] font-bold">$</span>
                  <input
                    value={paymentDueInput}
                    onChange={(event) => setPaymentDueInput(event.target.value.replace(/[^0-9.]/g, ''))}
                    placeholder="Paid amount"
                    inputMode="decimal"
                    className="w-full bg-transparent outline-none text-[15px] font-semibold text-[#3F312A]"
                  />
                </div>
              )}
              <p className="mt-1.5 text-[12px] text-[#6C5D54]">
                Turn on if payment is complete, then enter the paid amount.
              </p>
            </div>

            <div>
              <label className="text-[13px] font-semibold tracking-[0.08em] text-[#4A3D35] uppercase block mb-2">
                Parking Time
              </label>
              <div className="relative">
                <select
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(Number(event.target.value))}
                  className="w-full h-12 appearance-none rounded-[8px] border border-[#D3C5BB] bg-[#F6F1EE] px-3 pr-10 text-[15px] font-semibold text-[#3F312A] outline-none focus:border-[#D97706]/60"
                >
                {DURATION_OPTIONS.map((minutes) => (
                  <option
                    key={minutes}
                    value={minutes}
                  >
                    {formatTimeOption(minutes)}
                  </option>
                ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8F4700] text-[14px]">⌄</span>
              </div>
              <p className="mt-2 text-[12px] text-[#6C5D54]">
                Select how long this parking session should run.
              </p>
            </div>
          </div>

          <div className="rounded-[10px] border border-[#CDBFB4] p-4 bg-[#F8F5F2]">
            <label className="text-[13px] font-semibold tracking-[0.08em] text-[#4A3D35] uppercase block mb-3">
              Visual Aid {isOfflineMode ? '' : '(Optional)'}
            </label>

            {!imagePreview && (
              <>
                {isOfflineMode ? (
                  <>
                    <div className="rounded-[8px] border border-dashed border-[#9C7E69] h-[102px] grid place-items-center text-[#7A5D49]">
                      <div className="text-center">
                        <Camera size={24} className="mx-auto mb-2" />
                        <p className="text-[14px] font-medium">Capture spot landmark</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button onClick={handleTakePhoto} className="h-10 rounded-md bg-[#A25E00] text-white text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-[#8A4A00] transition-colors">
                        <Camera size={16} /> Take Photo
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="h-10 rounded-md border border-[#B9A79A] text-[#2A1E17] text-[14px] font-semibold flex items-center justify-center gap-2 bg-white/80 hover:bg-white transition-colors">
                        <Upload size={16} /> Upload
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleTakePhoto} className="h-[108px] rounded-[10px] border border-dashed border-[#C9B8AC] bg-[#F8F4F0] flex flex-col items-center justify-center gap-2 text-[#2A1E17] hover:bg-[#EDE7E0] transition-colors">
                      <Camera size={28} className="text-[#D97706]" />
                      <span className="text-[14px] font-semibold">Take Photo</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="h-[108px] rounded-[10px] border border-dashed border-[#C9B8AC] bg-[#F8F4F0] flex flex-col items-center justify-center gap-2 text-[#2A1E17] hover:bg-[#EDE7E0] transition-colors">
                      <Upload size={28} className="text-[#D97706]" />
                      <span className="text-[14px] font-semibold">Upload</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {imagePreview && (
              <div className="rounded-[8px] overflow-hidden">
                <img src={imagePreview} alt="Captured spot" className="w-full h-[300px] object-cover rounded-[8px]" />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleRemoveImage}
                    className="flex-1 h-10 rounded-md border border-[#9C7E69] text-[#2A1E17] text-[14px] font-semibold bg-white/80 hover:bg-white transition-colors"
                  >
                    Remove Image
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 h-10 rounded-md border border-[#9C7E69] text-[#2A1E17] text-[14px] font-semibold bg-white/80 hover:bg-white transition-colors"
                  >
                    Change Image
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <button
            onClick={handleConfirmSpot}
            disabled={isSaving}
            className="w-full h-[50px] rounded-[10px] bg-[#D97706] text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_18px_rgba(69,26,3,0.22)] active:scale-[0.99] transition-transform tracking-[0.02em] disabled:opacity-50"
          >
            {isSaving ? 'Saving Spot...' : 'Confirm Parking Spot'}
            <ChevronRight size={18} />
          </button>
        </section>
      </div>
    </main>
  );
}
