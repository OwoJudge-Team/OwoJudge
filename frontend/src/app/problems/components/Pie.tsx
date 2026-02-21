import React from "react";
import { SubmissionDetail } from "../../../types/problems";
import { SubmissionStatus, StatusToCode } from "../../../types/submissions";
import { getStatusColor } from "../../../utils/submission-status";

const CATEGORY_CONFIG: Record<string, SubmissionStatus> = {
  accepted: SubmissionStatus.AC,
  wrongAnswer: SubmissionStatus.WA,
  timeLimitExceeded: SubmissionStatus.TLE,
  memoryLimitExceeded: SubmissionStatus.MLE,
  runtimeError: SubmissionStatus.RE,
  compilationError: SubmissionStatus.CE,
  processLimitExceeded: SubmissionStatus.PLE,
};

interface Props {
  submissionDetail: SubmissionDetail;
  isOpen: boolean;
  onClose: () => void;
}

export default function PieChart({ submissionDetail, isOpen, onClose }: Props) {
  if (!isOpen) return null;

  const activeSlices = Object.entries(submissionDetail)
    .filter(([key]) => key in CATEGORY_CONFIG)
    .map(([key, value]) => ({
      key,
      value,
    }));

  const total = activeSlices.reduce((sum, cur) => sum + cur.value, 0);
  const radius = 15.915; // Circumference = 100
  let cumulativeOffset = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 1. Darkened Background Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* 2. Floating Card */}
      <div className="relative w-full max-w-md transform rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <h3 className="mb-6 text-center text-xl font-bold text-slate-800 dark:text-white">
          Submission Statistics
        </h3>

        {/* Legend Grid */}
        <div className="mb-8 grid grid-cols-4 gap-3">
          {activeSlices.map((slice) => (
            <div key={slice.key} className="flex items-center gap-2">
              <span
                className={`h-3 w-3 shrink-0 rounded-full bg-${getStatusColor(CATEGORY_CONFIG[slice.key])}`}
              />
              <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                {StatusToCode[CATEGORY_CONFIG[slice.key]]}:{" "}
                <span className="text-slate-900 dark:text-slate-100">{slice.value}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Pie Chart */}
        <div className="relative mx-auto h-56 w-56">
          <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90 transform">
            {total ? (
              activeSlices.map((slice) => {
                const percentage = (slice.value / total) * 100;
                const strokeOffset = cumulativeOffset;
                cumulativeOffset += percentage;

                return (
                  <circle
                    key={slice.key}
                    cx="21"
                    cy="21"
                    r={radius}
                    fill="transparent"
                    strokeWidth="8"
                    strokeDasharray={`${percentage} ${100 - percentage}`}
                    strokeDashoffset={-strokeOffset}
                    className={`transition-all duration-700 ease-out stroke-${getStatusColor(CATEGORY_CONFIG[slice.key])}`}
                  />
                );
              })
            ) : (
              <circle
                cx="21"
                cy="21"
                r={radius}
                fill="transparent"
                strokeWidth="8"
                strokeDasharray="100 0"
                strokeDashoffset="0"
                className={`stroke-slate-500/50 transition-all duration-700 ease-out`}
              />
            )}
          </svg>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold text-slate-800 dark:text-white">{total}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Total
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
