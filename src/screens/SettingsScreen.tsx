import { useState, useEffect } from 'react';
import { getReminderSettings, saveReminderSettings } from '../lib/reminderSettings';
import { AppHeader } from '../components/layout/AppHeader';
import { AppScreenShell } from '../components/layout/AppScreenShell';

interface SettingsScreenProps {
  showHelp?: () => void;
}

const TIMING_OPTIONS = [5, 10, 15, 20];
type SupportAction = 'help' | 'contact' | 'privacy';

export function SettingsScreen({ showHelp }: SettingsScreenProps) {
  const [appVersion] = useState('1.0.0');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState(5);
  const [locationTracking, setLocationTracking] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedSupportAction, setSelectedSupportAction] = useState<SupportAction | null>(null);

  useEffect(() => {
    // Load user preferences from localStorage
    const saved = localStorage.getItem('parkwise_settings');
    if (saved) {
      const settings = JSON.parse(saved);
      setNotificationsEnabled(settings.notificationsEnabled ?? true);
      setLocationTracking(settings.locationTracking ?? true);
      setDarkMode(settings.darkMode ?? false);
    }

    // Load reminder settings
    const reminderSettings = getReminderSettings();
    setNotificationsEnabled(reminderSettings.enabled);
    setReminderLeadMinutes(reminderSettings.leadMinutes);
  }, []);

const saveSettings = (key: string, value: boolean | number) => {
    const settings = {
      notificationsEnabled,
      locationTracking,
      darkMode,
      [key]: value,
    };
    localStorage.setItem('parkwise_settings', JSON.stringify(settings));

    // Also save reminder settings
    if (key === 'notificationsEnabled' || key === 'reminderLeadMinutes') {
      saveReminderSettings({
        enabled: key === 'notificationsEnabled' ? (value as boolean) : notificationsEnabled,
        leadMinutes: key === 'reminderLeadMinutes' ? (value as number) : reminderLeadMinutes,
      });
    }
  };

  const handleNotificationsChange = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    saveSettings('notificationsEnabled', newValue);
  };

  const handleReminderTimingChange = (minutes: number) => {
    setReminderLeadMinutes(minutes);
    saveSettings('reminderLeadMinutes', minutes);
  };

  const handleLocationChange = () => {
    const newValue = !locationTracking;
    setLocationTracking(newValue);
    saveSettings('locationTracking', newValue);
  };

  const handleDarkModeChange = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    saveSettings('darkMode', newValue);
    
    // Dispatch custom event for immediate update in same tab
    const event = new CustomEvent('darkModeToggled', { detail: newValue });
    window.dispatchEvent(event);
  };

  const getSupportButtonClass = (action: SupportAction) => {
    const isSelected = selectedSupportAction === action;
    return `w-full text-left py-md px-lg rounded-lg bg-surface-container hover:bg-surface transition-colors flex items-center justify-between ${
      isSelected ? 'border-2 border-primary' : 'border border-outline-variant'
    }`;
  };

  const getSupportTitleClass = (action: SupportAction) => (
    `text-label-lg font-semibold ${selectedSupportAction === action ? 'text-primary' : 'text-on-surface'}`
  );

  return (
    <AppScreenShell darkMode={darkMode}>
      <AppHeader darkMode={darkMode} />

        <section className="p-5 pb-28">
          {/* Header */}
          <section className="mb-xl">
            <h1 className={`text-[38px] font-semibold leading-[1.05] ${darkMode ? 'text-[#e0e0e0]' : 'text-[#271E1B]'}`}>Settings</h1>
            <p className={`mt-2 text-[15px] leading-[1.35] ${darkMode ? 'text-[#aaa]' : 'text-[#5F514A]'}`}>
              Manage your ParkWise AI preferences.
            </p>
          </section>

          {/* Settings Sections */}
          <div className="space-y-lg">
        {/* Notifications Section */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h2 className="text-headline-sm font-bold text-on-surface mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">notifications</span>
            Notifications
          </h2>
          <div className="space-y-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-label-lg font-semibold text-on-surface">Parking Reminders</p>
                <p className="text-label-sm text-on-surface-variant">Get notified before parking expires</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={handleNotificationsChange}
                  className="w-5 h-5 cursor-pointer accent-primary"
                />
              </label>
            </div>

            {/* Reminder Timing Options */}
            {notificationsEnabled && (
              <div className="bg-surface-container p-lg rounded-lg border border-outline-variant">
                <p className="text-label-lg font-semibold text-on-surface mb-md">Remind me</p>
                <div className="grid grid-cols-4 gap-sm">
                  {TIMING_OPTIONS.map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => handleReminderTimingChange(minutes)}
                      className={`py-md px-sm rounded-lg border-2 text-label-sm font-semibold transition-all ${
                        reminderLeadMinutes === minutes
                          ? 'border-primary bg-primary-fixed-dim text-primary'
                          : 'border-outline bg-surface hover:border-primary text-on-surface'
                      }`}
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Location Section */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h2 className="text-headline-sm font-bold text-on-surface mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">location_on</span>
            Location & Privacy
          </h2>
          <div className="space-y-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-label-lg font-semibold text-on-surface">Location Tracking</p>
                <p className="text-label-sm text-on-surface-variant">Track parking location for safety</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={locationTracking}
                  onChange={handleLocationChange}
                  className="w-5 h-5 cursor-pointer accent-primary"
                />
              </label>
            </div>
            <div className="bg-surface-container p-md rounded-lg border border-outline-variant">
              <p className="text-label-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] align-text-bottom mr-xs">info</span>
                Your location is only stored during active parking sessions and never shared with third parties.
              </p>
            </div>
          </div>
        </section>

        {/* Display Section */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h2 className="text-headline-sm font-bold text-on-surface mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">brightness_4</span>
            Display
          </h2>
          <div className="space-y-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-label-lg font-semibold text-on-surface">Dark Mode</p>
                <p className="text-label-sm text-on-surface-variant">Easier on the eyes at night</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={darkMode}
                  onChange={handleDarkModeChange}
                  className="w-5 h-5 cursor-pointer accent-primary"
                />
              </label>
            </div>
          </div>
        </section>

{/* Help & Support Section */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <h2 className="text-headline-sm font-bold text-on-surface mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">help</span>
            Help & Support
          </h2>
          <div className="space-y-sm">
            <button
              onClick={() => {
                setSelectedSupportAction('help');
                showHelp?.();
              }}
              className={getSupportButtonClass('help')}
            >
              <div>
                <p className={getSupportTitleClass('help')}>How to use ParkWise AI</p>
                <p className="text-label-sm text-on-surface-variant">Learn how to scan and manage parking</p>
              </div>
              <span className="material-symbols-outlined text-primary">arrow_forward</span>
            </button>
            <button
              onClick={() => setSelectedSupportAction('contact')}
              className={getSupportButtonClass('contact')}
            >
              <div>
                <p className={getSupportTitleClass('contact')}>Contact Support</p>
                <p className="text-label-sm text-on-surface-variant">Send us feedback or report issues</p>
              </div>
              <span className="material-symbols-outlined text-primary">arrow_forward</span>
            </button>
            <button
              onClick={() => setSelectedSupportAction('privacy')}
              className={getSupportButtonClass('privacy')}
            >
              <div>
                <p className={getSupportTitleClass('privacy')}>Privacy Policy</p>
                <p className="text-label-sm text-on-surface-variant">View our privacy & terms</p>
              </div>
              <span className="material-symbols-outlined text-primary">arrow_forward</span>
            </button>
          </div>
        </section>

        {/* App Info Section */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <div className="text-center">
            <div className="flex items-center justify-center gap-xs mb-md">
              <span className="material-symbols-outlined text-[32px] text-primary">local_parking</span>
              <h3 className="text-headline-sm font-bold text-on-surface">ParkWise AI</h3>
            </div>
            <p className="text-label-lg text-on-surface-variant mb-xs">Version {appVersion}</p>
            <p className="text-label-sm text-on-surface-variant opacity-70">Smart parking analysis powered by AI</p>
          </div>
        </section>
          </div>
        </section>
    </AppScreenShell>
  );
}
