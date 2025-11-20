// Helper function to get status color
// When you add a new color here, remember to also update the safelist in tailwind.config.ts
export const getStatusColor = (status: string) => {
  switch (status) {
    case "AC":
      return "bg-green-600/50";
    case "WA":
      return "bg-red-600/50";
    case "TLE":
      return "bg-blue-600/50";
    case "MLE":
      return "bg-purple-600/50";
    default:
      return "";
  }
};
