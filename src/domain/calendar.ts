const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

function formatDate(year: number, month: number, day: number): string {
  const paddedYear = String(year).padStart(4, '0');
  const paddedMonth = String(month).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');
  return `${paddedYear}-${paddedMonth}-${paddedDay}`;
}

function parseDate(date: string): CalendarDate {
  const match = DATE_PATTERN.exec(date);
  if (match === null) {
    throw new Error(`Invalid date: ${date}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    year < 1 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    throw new Error(`Invalid date: ${date}`);
  }

  return { year, month, day };
}

export function previousDate(date: string): string {
  const parsed = parseDate(date);

  if (parsed.day > 1) {
    return formatDate(parsed.year, parsed.month, parsed.day - 1);
  }

  if (parsed.month > 1) {
    const previousMonth = parsed.month - 1;
    return formatDate(
      parsed.year,
      previousMonth,
      daysInMonth(parsed.year, previousMonth),
    );
  }

  return formatDate(parsed.year - 1, 12, 31);
}

export function gameDayOf(
  localDate: string,
  localHour: number,
  dayBoundaryHour: number,
): string {
  parseDate(localDate);

  if (localHour < dayBoundaryHour) {
    return previousDate(localDate);
  }

  return localDate;
}
