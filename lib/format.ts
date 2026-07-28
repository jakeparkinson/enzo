const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

// Deliberately pinned to UTC, unlike `dateFormatter` above. Timestamps
// (order createdAt/readyDate) should render as the local calendar day they
// happened on, but a date-of-birth is a plain calendar date with no
// time-of-day — formatting it in the browser's local timezone risks
// shifting it a day in either direction, since `@db.Date` values come back
// as UTC midnight (e.g. midnight UTC displays as the previous evening in
// any negative UTC-offset timezone).
const dateOnlyFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function formatCurrency(value: string | number): string {
  return currencyFormatter.format(Number(value));
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateOfBirth(value: string | Date): string {
  return dateOnlyFormatter.format(new Date(value));
}
