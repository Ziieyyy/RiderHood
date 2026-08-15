import type { Workshop } from '../types/database';

export interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface WorkshopStatusResult {
  isOpen: boolean;
  statusText: string;
  scheduleText?: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseTime12h(timeStr: string): number | null {
  if (!timeStr) return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function getWorkshopOpenStatus(workshop: Partial<Workshop>): WorkshopStatusResult {
  if (!workshop) {
    return { isOpen: false, statusText: 'Closed' };
  }

  let schedules: DaySchedule[] = [];
  if (workshop.operating_hours) {
    try {
      const parsed = typeof workshop.operating_hours === 'string'
        ? JSON.parse(workshop.operating_hours)
        : workshop.operating_hours;
      if (Array.isArray(parsed)) {
        schedules = parsed;
      }
    } catch {
      // ignore
    }
  }

  const now = new Date();
  const currentDayName = DAY_NAMES[now.getDay()];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todaySched = schedules.find((s) => s.day?.toLowerCase() === currentDayName.toLowerCase());

  if (todaySched) {
    if (!todaySched.isOpen) {
      return {
        isOpen: false,
        statusText: 'Closed Today',
        scheduleText: `${currentDayName}: Closed`,
      };
    }

    const openMins = parseTime12h(todaySched.openTime);
    const closeMins = parseTime12h(todaySched.closeTime);

    if (openMins !== null && closeMins !== null) {
      const isOpenNow = currentMinutes >= openMins && currentMinutes < closeMins;
      return {
        isOpen: isOpenNow,
        statusText: isOpenNow ? 'Open Now' : 'Closed Now',
        scheduleText: `${todaySched.openTime} – ${todaySched.closeTime}`,
      };
    }
  }

  // Fallback to is_open column value if operating_hours JSON is not detailed
  const fallbackOpen = workshop.is_open ?? false;
  return {
    isOpen: fallbackOpen,
    statusText: fallbackOpen ? 'Open' : 'Closed',
  };
}
