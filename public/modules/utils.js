// utils.js — pure utility functions (no imports needed)

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function closestFromEvent(event, selector) {
  const target = event.target?.nodeType === Node.ELEMENT_NODE
    ? event.target
    : event.target?.parentElement;
  return target?.closest?.(selector) ?? null;
}

export function targetElementFromEvent(event) {
  return event.target?.nodeType === Node.ELEMENT_NODE
    ? event.target
    : event.target?.parentElement ?? null;
}

export function norm(value) {
  return String(value ?? '').trim();
}

export function slug(value) {
  return norm(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function dateValue(value) {
  return dateOrNull(value);
}

export function formatDate(value) {
  const date = dateValue(value);
  if (!date) return '-';
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function displayDate(value) {
  const date = dateValue(value);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function monthLabel(date) {
  return date.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });
}

export function currentMonthKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

export function middleEllipsis(value, limit = 28) {
  const text = norm(value);
  if (text.length <= limit) return text;
  const keep = Math.floor((limit - 3) / 2);
  return `${text.slice(0, keep)}...${text.slice(-keep)}`;
}

export function percent(value, total) {
  if (!total) return 0;
  return (value / total) * 100;
}

export function formatPercent(value) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

export function formatDurationSeconds(value) {
  const total = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function emptyToNull(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

export function numberOrNull(value) {
  const text = String(value ?? '').replace(/,/g, '').trim();
  if (text === '') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function dateOrNull(value) {
  if (!value) return null;
  const text = String(value).trim();
  const jiraDate = text.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (jiraDate) {
    const [, day, monthText, yearText, hourText, minuteText, meridiem] = jiraDate;
    const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(monthText.toLowerCase());
    const year = Number(yearText.length === 2 ? `20${yearText}` : yearText);
    let hour = Number(hourText) % 12;
    if (meridiem.toUpperCase() === 'PM') hour += 12;
    const parsedJiraDate = new Date(year, month, Number(day), hour, Number(minuteText));
    return Number.isNaN(parsedJiraDate.getTime()) ? null : parsedJiraDate;
  }
  const numericDate = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (numericDate) {
    const [, dayText, monthText, yearText, hourText = '0', minuteText = '0', secondText = '0'] = numericDate;
    const year = Number(yearText.length === 2 ? `20${yearText}` : yearText);
    const parsedNumericDate = new Date(
      year,
      Number(monthText) - 1,
      Number(dayText),
      Number(hourText),
      Number(minuteText),
      Number(secondText)
    );
    return Number.isNaN(parsedNumericDate.getTime()) ? null : parsedNumericDate;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isoOrNull(value) {
  return dateOrNull(value)?.toISOString() ?? null;
}

export function hoursBetween(startValue, endValue) {
  const start = dateOrNull(startValue);
  const end = dateOrNull(endValue);
  if (!start || !end || end < start) return null;
  return Number(((end.getTime() - start.getTime()) / 36e5).toFixed(1));
}

export function projectNameKey(value) {
  return norm(value).toLowerCase().replace(/\s+/g, ' ');
}

export function topEntry(entries) {
  return entries[0] ?? ['-', 0];
}
