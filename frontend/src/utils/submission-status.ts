import { Status, SubmissionStatus } from "../constants/submissions";

// Helper function to get status color
// When you add a new color here, remember to also update the safelist in tailwind.config.ts
export const getStatusColor = (status: Status) => {
  switch (status) {
    case SubmissionStatus.AC:
      return "bg-green-600/50";
    case SubmissionStatus.WA:
      return "bg-red-600/50";
    case SubmissionStatus.TLE:
      return "bg-blue-600/50";
    case SubmissionStatus.MLE:
      return "bg-purple-600/50";
    case SubmissionStatus.CE:
      return "bg-yellow-400/50";
    case SubmissionStatus.RE:
      return "bg-orange-500/50";
    case SubmissionStatus.SE:
      return "bg-zinc-600/50";
    case SubmissionStatus.PS:
      return "bg-lime-500/50";
    case SubmissionStatus.PLE:
      return "bg-pink-500/50";
    default:
      return "";
  }
};
