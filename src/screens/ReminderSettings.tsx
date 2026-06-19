import { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Clock3, Home, CarFront, Search, Settings, Save } from 'lucide-react';
import profileAvatar from '../assets/dashboard/profile-avatar.svg';
import { getReminderSettings, saveReminderSettings } from '../lib/reminderSettings';

interface ReminderSettingsScreenProps {
  onBack?: () => void;
  onHomeClick?: () => void;
  onParkClick?: () => void;
  onCheckClick?: () => void;
  onSettingsClick?: () => void;
}

const TIMING_OPTIONS = [5, 10, 15, 20];

export function ReminderSettingsScreen({ onBack, onHomeClick, onParkClick, onCheckClick, onSettingsClick }: ReminderSettingsScreenProps) {
  const [enabled, setEnabled] = useState(true);
  const [leadMinutes, setLeadMinutes] = useState(5);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const settings = getReminderSettings();
    setEnabled(settings.enabled);
    setLeadMinutes(settings.leadMinutes);
  }, []);

  function handleSave() {
    saveReminderSettings({ enabled, leadMinutes });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  }

  return (
    <main className="flex-grow w-full max-w-[600px] mx-auto px-3 sm:px-4 pt-3 pb-20 bg-[#EEE8E2]">
      <div className="mx-auto w-full max-w-[540px] min-h-[860px] rounded-[20px] border border-[#D6CBC2] bg-[#F8F1EC] shadow-[0_4px_22px_rgba(28,25,23,0.12)] overflow-hidden flex flex-col">
        <header className="h-[64px] px-4 border-b border-[#D7CCC2] flex items-center justify-between bg-[#FFF7F0]">
          <div className="flex items-center gap-3 text-[#9A4D00]">
            <button onClick={onBack} className="w-8 h-8 grid place-items-center rounded-full hover:bg-[#F4E5D8] transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-[20px] font-bold">Reminder Settings</h1>
          </div>
          <img src={profileAvatar} alt="Profile" className="w-8 h-8 rounded-full border-2 border-[#D97706]/45" />
        </header>

        <section className="flex-1 p-5 space-y-5">
          <p className="text-[15px] leading-[1.45] text-[#3B302A]">
            Customize how and when ParkPulse notifies you about your parking sessions and payments.
          </p>

          <div className="rounded-[10px] border border-[#E2B995] bg-[#FFF7F0] p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-[6px] bg-[#FFD8BC] grid place-items-center text-[#8F4700]">
                <Bell size={22} />
              </div>
              <div>
                <h2 className="text-[14px] font-bold text-[#2A1E17]">Automated Reminders</h2>
                <p className="text-[12px] text-[#4F4139]">Notify before session expires</p>
              </div>
            </div>
            <button
              onClick={() => setEnabled((value) => !value)}
              className={`relative shrink-0 w-[54px] h-[30px] rounded-full transition-colors ${enabled ? 'bg-[#C46905]' : 'bg-[#C8BDB5]'}`}
              aria-pressed={enabled}
            >
              <span className={`absolute left-[3px] top-[3px] w-6 h-6 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="rounded-[10px] border border-[#E2B995] bg-[#FFF7F0] p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-[6px] bg-[#FFD8BC] grid place-items-center text-[#8F4700]">
                <Clock3 size={22} />
              </div>
              <div>
                <h2 className="text-[14px] font-bold text-[#2A1E17]">Reminder Timing</h2>
                <p className="text-[12px] text-[#4F4139]">How long before expiry?</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {TIMING_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => setLeadMinutes(minutes)}
                  className={`h-10 rounded-[4px] border text-[13px] font-bold transition-colors ${
                    leadMinutes === minutes
                      ? 'border-[#B85F07] bg-[#FFF1E3] text-[#9A4D00]'
                      : 'border-[#E2C5AF] bg-[#FFF9F4] text-[#4C3D35]'
                  }`}
                >
                  {minutes}m
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[10px] h-[170px] overflow-hidden relative bg-gradient-to-br from-[#6D5945] via-[#B98A4B] to-[#3C332D]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,235,180,0.32),transparent_38%)]" />
            <Clock3 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#2D241F]/70" size={116} strokeWidth={1.1} />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#F8F1EC] to-transparent" />
          </div>

          <button
            onClick={handleSave}
            className="w-full h-[52px] rounded-[8px] bg-[#A95500] text-white text-[14px] font-bold flex items-center justify-center gap-2 shadow-[0_8px_16px_rgba(69,26,3,0.18)] active:scale-[0.99] transition-transform"
          >
            <Save size={16} /> {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </section>

        <div className="border-t border-[#D7CCC2] h-[74px] bg-[#F4F0EC] px-6 flex items-center justify-between">
          <button onClick={onHomeClick} className="flex flex-col items-center justify-center text-[#4B3A31] min-w-[56px]">
            <Home size={20} />
            <span className="text-[12px] mt-0.5">Home</span>
          </button>
          <button onClick={onParkClick} className="flex flex-col items-center justify-center text-[#4B3A31] min-w-[56px]">
            <CarFront size={20} />
            <span className="text-[12px] mt-0.5">Park</span>
          </button>
          <button onClick={onCheckClick} className="flex flex-col items-center justify-center text-[#4B3A31] min-w-[56px]">
            <Search size={20} />
            <span className="text-[12px] mt-0.5">Check</span>
          </button>
          <button onClick={onSettingsClick} className="w-[70px] h-[52px] rounded-[10px] bg-[#C46905] text-white flex flex-col items-center justify-center">
            <Settings size={20} />
            <span className="text-[12px] leading-none">Settings</span>
          </button>
        </div>
      </div>
    </main>
  );
}
