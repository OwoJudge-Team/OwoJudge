// Helper function to get status color
export const getStatusColor = (status: string) => {
  switch (status) {
    case "AC":
      return "green-600/50";
    case "WA":
      return "red-600/50";
    case "TLE":
      return "blue-600/50";
    case "MLE":
      return "purple-600/50";
    default:
      return "";
  }
};
