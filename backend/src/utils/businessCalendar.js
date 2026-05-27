// Производственный календарь для расчета дат ТО. Содержит фиксированные
// праздники, дополнительные выходные и рабочие переносы на ближайшие годы.
const FIXED_HOLIDAYS = [
  '01-01',
  '01-02',
  '01-03',
  '01-04',
  '01-05',
  '01-06',
  '01-07',
  '01-08',
  '02-23',
  '03-08',
  '05-01',
  '05-09',
  '06-12',
  '11-04',
];

const EXTRA_NON_WORKING_DAYS = {
  2024: [
    '2024-04-29',
    '2024-04-30',
    '2024-05-10',
    '2024-12-30',
    '2024-12-31',
  ],
  2025: [
    '2025-05-02',
    '2025-05-08',
    '2025-06-13',
    '2025-11-03',
    '2025-12-31',
  ],
  2026: [
    '2025-12-31',
    '2026-01-09',
    '2026-03-09',
    '2026-05-11',
    '2026-12-31',
  ],
};

const WORKING_WEEKEND_DAYS = {
  2024: ['2024-04-27', '2024-11-02', '2024-12-28'],
  2025: ['2025-11-01'],
};

function normalizeDateKey(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

function toUtcDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value, days) {
  const dateKey = normalizeDateKey(value);
  if (!dateKey) return null;

  const date = toUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

function getYear(dateKey) {
  return Number(dateKey.slice(0, 4));
}

function isWeekend(dateKey) {
  const day = toUtcDate(dateKey).getUTCDay();
  return day === 0 || day === 6;
}

function includesDate(map, dateKey) {
  return (map[getYear(dateKey)] || []).includes(dateKey);
}

function isFixedHoliday(dateKey) {
  return FIXED_HOLIDAYS.includes(dateKey.slice(5));
}

function isWorkingDay(value) {
  // Перенесенные рабочие субботы важнее правила "суббота/воскресенье".
  const dateKey = normalizeDateKey(value);
  if (!dateKey) return false;
  if (includesDate(WORKING_WEEKEND_DAYS, dateKey)) return true;
  if (includesDate(EXTRA_NON_WORKING_DAYS, dateKey)) return false;
  if (isFixedHoliday(dateKey)) return false;
  return !isWeekend(dateKey);
}

function shiftToPreviousWorkingDay(value) {
  // Если расчетная дата попала на выходной/праздник, сдвигаем срок назад,
  // чтобы дедлайн ТО оставался рабочим днем.
  let dateKey = normalizeDateKey(value);
  if (!dateKey) return null;

  while (!isWorkingDay(dateKey)) {
    dateKey = addDays(dateKey, -1);
  }

  return dateKey;
}

function getBundledCalendarRows(years = []) {
  const targetYears = years.length
    ? years.map(Number)
    : Array.from(new Set([
      ...Object.keys(EXTRA_NON_WORKING_DAYS).map(Number),
      ...Object.keys(WORKING_WEEKEND_DAYS).map(Number),
    ]));

  return targetYears.flatMap((year) => [
    ...(EXTRA_NON_WORKING_DAYS[year] || []).map((date) => ({
      calendar_date: date,
      is_working_day: false,
      description: 'Перенесенный выходной или праздничный день',
    })),
    ...(WORKING_WEEKEND_DAYS[year] || []).map((date) => ({
      calendar_date: date,
      is_working_day: true,
      description: 'Рабочий день по переносу',
    })),
  ]);
}

function calculateMaintenanceExpiryDate(baseDate) {
  // Бизнес-правило: очередное ТО через 365 календарных дней от базовой даты.
  const rawExpiryDate = addDays(baseDate, 365);
  return shiftToPreviousWorkingDay(rawExpiryDate);
}

function daysBetween(fromDate, toDate) {
  const fromKey = normalizeDateKey(fromDate);
  const toKey = normalizeDateKey(toDate);
  if (!fromKey || !toKey) return 0;

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((toUtcDate(toKey) - toUtcDate(fromKey)) / msPerDay);
}

module.exports = {
  calculateMaintenanceExpiryDate,
  daysBetween,
  getBundledCalendarRows,
  isWorkingDay,
  normalizeDateKey,
  shiftToPreviousWorkingDay,
};
