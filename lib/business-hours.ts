export interface BusinessHoursConfig {
  enabled: boolean;
  schedule: {
    [day: string]: { open: string; close: string; closed?: boolean } | null;
  };
  timezone: string;
  holidayDates?: string[];
}

const DEFAULT_SCHEDULE: BusinessHoursConfig = {
  enabled: false,
  schedule: {
    monday: { open: "09:00", close: "17:00" },
    tuesday: { open: "09:00", close: "17:00" },
    wednesday: { open: "09:00", close: "17:00" },
    thursday: { open: "09:00", close: "17:00" },
    friday: { open: "09:00", close: "17:00" },
    saturday: null,
    sunday: null,
  },
  timezone: "America/New_York",
};

export function isWithinBusinessHours(config: BusinessHoursConfig | null): boolean {
  if (!config || !config.enabled) return true;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone || "America/New_York",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find(p => p.type === "weekday")?.value?.toLowerCase() || "";
  const hour = parts.find(p => p.type === "hour")?.value || "00";
  const minute = parts.find(p => p.type === "minute")?.value || "00";
  const currentTime = `${hour}:${minute}`;

  if (config.holidayDates) {
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: config.timezone || "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayStr = dateFormatter.format(now);
    if (config.holidayDates.includes(todayStr)) return false;
  }

  const daySchedule = config.schedule[weekday];
  if (!daySchedule || daySchedule.closed) return false;

  return currentTime >= daySchedule.open && currentTime < daySchedule.close;
}

export function getNextOpenTime(config: BusinessHoursConfig): string {
  if (!config || !config.enabled) return "We are always open.";
  
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone || "America/New_York",
    weekday: "long",
  });
  const currentDay = formatter.format(now).toLowerCase();
  const currentIndex = days.indexOf(currentDay);
  
  for (let i = 0; i < 7; i++) {
    const checkDay = days[(currentIndex + i + 1) % 7];
    const schedule = config.schedule[checkDay];
    if (schedule && !schedule.closed) {
      return `We open on ${checkDay.charAt(0).toUpperCase() + checkDay.slice(1)} at ${schedule.open}.`;
    }
  }
  return "Please check our website for business hours.";
}

export { DEFAULT_SCHEDULE };
