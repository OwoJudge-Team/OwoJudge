const formatISOTime = (isoString: string) => {
  const date = new Date(isoString);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(",", "");
};

const TIME_TO_COLOR = ["emerald-600/90", "yellow-500/70", "rose-600/70", "slate-600/50"];

// Compare start and end time to current time
// Return values:
// 3: Current time not within start and end time
// 2: Current time within start and end time, less than one hour to end time
// 1: Current time within start and end time, less than one day to end time
// 0: Current time within start and end time, more than one day to end time
const compareToCurrentTime = (start: string, end: string) => {
  const d1 = new Date(start).getTime();
  const d2 = new Date(end).getTime();
  const d3 = new Date().getTime();

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const ONE_HOUR_MS = 60 * 60 * 1000;

  if (d3 < d1 || d3 > d2) {
    return 3;
  } else if (d2 - d3 <= ONE_HOUR_MS) {
    return 2;
  } else if (d2 - d3 <= ONE_DAY_MS) {
    return 1;
  } else {
    return 0;
  }
};

export { formatISOTime, compareToCurrentTime, TIME_TO_COLOR };
