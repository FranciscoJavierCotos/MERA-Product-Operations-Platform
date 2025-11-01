import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatDate(date: string | Date, formatStr: string = "PPP") {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

export function formatRelativeTime(date: string | Date) {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function formatDateTime(date: string | Date) {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "PPp");
}
