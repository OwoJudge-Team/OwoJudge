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

const TIME_TO_COLOR = ["emerald-600/90", "rose-600/70", "slate-600/50"];

// Compare start and end time to current time
// Return values:
// 2: Current time not within start and end time
// 1: Current time within mid and end time and mid is not null
// 0: Current time within start and end time but before mid time
const compareToCurrentTime = (start: string, mid: string | undefined, end: string) => {
  const d1 = new Date(start).getTime();
  const d2 = new Date(end).getTime();
  const d3 = new Date().getTime();

  if (d3 < d1 || d3 > d2) {
    return 2;
  } else if (mid && d3 > new Date(mid).getTime()) {
    return 1;
  } else {
    return 0;
  }
};

export { formatISOTime, compareToCurrentTime, TIME_TO_COLOR };
