export interface ReminderSettings {
  enabled: boolean;
  leadMinutes: number;
}

const STORAGE_KEY = 'parkpulse_reminder_settings';

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  leadMinutes: 5,
};

export function getReminderSettings(): ReminderSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_REMINDER_SETTINGS;

    const parsed = JSON.parse(saved) as Partial<ReminderSettings>;
    return {
      enabled: parsed.enabled ?? DEFAULT_REMINDER_SETTINGS.enabled,
      leadMinutes: parsed.leadMinutes ?? DEFAULT_REMINDER_SETTINGS.leadMinutes,
    };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export function saveReminderSettings(settings: ReminderSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
