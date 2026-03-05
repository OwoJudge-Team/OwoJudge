import { Status, SubmissionStatus } from "../types/submissions";

// Helper function to get status color
// When you add a new color here, remember to also update the safelist in tailwind.config.ts
export const getStatusColor = (status: Status) => {
  switch (status) {
    case SubmissionStatus.AC:
      return "green-600/50";
    case SubmissionStatus.WA:
      return "red-600/50";
    case SubmissionStatus.TLE:
      return "blue-600/50";
    case SubmissionStatus.MLE:
      return "purple-600/50";
    case SubmissionStatus.CE:
      return "yellow-400/50";
    case SubmissionStatus.RE:
      return "orange-500/50";
    case SubmissionStatus.SE:
      return "zinc-600/50";
    case SubmissionStatus.PS:
      return "lime-500/50";
    case SubmissionStatus.PLE:
      return "pink-500/50";
    default:
      return "";
  }
};
