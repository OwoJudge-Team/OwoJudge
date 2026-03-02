"use client";

import React from "react";
import { FaRegFlag } from "react-icons/fa";
import { formatISOTime, compareToCurrentTime, TIME_TO_COLOR } from "@/utils/time";

interface TimelineProps {
  startTimeISO: string;
  midTimeISO: string | undefined;
  endTimeISO: string;
}

export default function ReactIconTimeline({ startTimeISO, midTimeISO, endTimeISO }: TimelineProps) {
  const now = new Date();
  const startTime = new Date(startTimeISO);
  const midTime = midTimeISO ? new Date(midTimeISO) : undefined;
  const endTime = new Date(endTimeISO);

  const startMs = startTime.getTime();
  const midMs = midTime ? midTime.getTime() : null;
  const endMs = endTime.getTime();
  const nowMs = now.getTime();

  const isActive = nowMs >= startMs && nowMs <= endMs;

  const totalDuration = endMs - startMs;
  const elapsed = nowMs - startMs;
  const rawPercent = (elapsed / totalDuration) * 100;

  const percentage = Math.min(Math.max(rawPercent, 0), 100);

  return (
    <div className="flex w-full flex-col">
      <p className="mb-1 p-2 font-medium text-slate-300">
        Status:{" "}
        {isActive
          ? midMs
            ? midMs > nowMs
              ? "Open for Submissions"
              : "Open for Late Submissions"
            : "Active"
          : startMs > nowMs
            ? "Upcoming"
            : "Completed"}
      </p>
      <div className="relative my-2 h-4 w-[95%] self-center rounded-full bg-slate-600">
        {isActive ? (
          <div
            className={`absolute h-full rounded-full transition-all duration-1000 ease-linear bg-${TIME_TO_COLOR[compareToCurrentTime(startTimeISO, midTimeISO, endTimeISO)]}`}
            style={{
              left: `${percentage}%`,
              right: "0%",
            }}
          />
        ) : (
          <div className="absolute inset-0 rounded-full bg-slate-600" />
        )}

        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out"
          style={{ left: "100%" }}
        >
          <div className="group flex flex-col items-center">
            <div className="rounded-full border border-[4px] border-white bg-slate-600 p-1 shadow-md">
              <FaRegFlag className={`text-xs text-white`} />
            </div>
            <div className="pointer-events-none absolute right-[50%] top-full mb-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
              Late Submission End Time: {formatISOTime(endTimeISO)}
            </div>
          </div>
        </div>

        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out">
          <div className="group flex flex-col items-center">
            <div className="rounded-full border border-[4px] border-white bg-slate-600 p-1 shadow-md">
              <FaRegFlag className={`text-xs text-white`} />
            </div>
            <div className="pointer-events-none absolute left-[50%] top-full mb-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
              Start Time: {formatISOTime(startTimeISO)}
            </div>
          </div>
        </div>

        {midTimeISO && (
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out"
            style={{
              left: `${Math.min(Math.max(((midMs! - startMs) / totalDuration) * 100, 0), 100)}%`,
            }}
          >
            <div className="group flex flex-col items-center">
              <div className="rounded-full border border-[4px] border-white bg-slate-600 p-1 shadow-md">
                <FaRegFlag className={`text-xs text-white`} />
              </div>
              <div className="pointer-events-none absolute top-full mb-2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                End Time: {formatISOTime(midTimeISO)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
