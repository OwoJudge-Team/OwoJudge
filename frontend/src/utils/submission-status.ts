// Helper function to get status color
export const getStatusColor = (status: string) => {
  switch (status) {
    case "AC":
      return "text-green-600";
    case "WA":
      return "text-red-600";
    case "TLE":
      return "text-blue-600";
    case "MLE":
      return "text-purple-600";
    default:
      return "";
  }
};