const formatISOTime = (isoString: string) => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const compareToCurrentTime = (date: string) => {
  const d1 = new Date(date).getTime();
  const d2 = new Date().getTime();

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  // 1. After current time
  if (d1 < d2) {
    return 2;
  }

  const difference = d1 - d2;

  // 2. One day before current time
  if (difference <= ONE_DAY_MS) {
    return 1;
  }

  // 3. Before one day of current time
  return 0;
};

export { formatISOTime, compareToCurrentTime };
