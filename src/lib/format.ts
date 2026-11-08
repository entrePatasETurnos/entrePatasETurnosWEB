/**
 * Dates come from the API in UTC. The business runs in Brasília, so everything is shown in
 * America/Sao_Paulo, whatever time zone the server or the visitor is in.
 */
const TIME_ZONE = "America/Sao_Paulo";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const dateOnly = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const isoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Qua., 11/11, 08:00" */
export function formatDateTime(iso: string) {
  return capitalize(dateTime.format(new Date(iso)));
}

/** "07/11/2026" */
export function formatDate(iso: string) {
  return dateOnly.format(new Date(iso));
}

/** Calendar nights between check-in and check-out, counted in Brasília time. */
export function nightsBetween(checkIn: string, checkOut: string) {
  const start = Date.parse(isoDay.format(new Date(checkIn)));
  const end = Date.parse(isoDay.format(new Date(checkOut)));
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** "Thor", "Thor e Mel", "Thor, Mel e Bob" */
export function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}
