"use client";

import React from "react";
import { IoTime } from "react-icons/io5";
import { formatISOTime, compareToCurrentTime, TIME_TO_COLOR } from "@/utils/time";

interface TimelineProps {
  startTimeISO: string;
  endTimeISO: string;
}

export default function ReactIconTimeline({ startTimeISO, endTimeISO }: TimelineProps) {
  const now = new Date();
  const startTime = new Date(startTimeISO);
  const endTime = new Date(endTimeISO);

  const startMs = startTime.getTime();
  const endMs = endTime.getTime();
  const nowMs = now.getTime();

  const isActive = nowMs >= startMs && nowMs <= endMs;

  const totalDuration = endMs - startMs;
  const elapsed = nowMs - startMs;
  const rawPercent = (elapsed / totalDuration) * 100;

  const percentage = Math.min(Math.max(rawPercent, 0), 100);

  return (
    <div className="w-full">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Start</p>
          <p className="text-md font-mono text-slate-300">{formatISOTime(startTimeISO)}</p>
        </div>

        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">End</p>
          <p className="text-md font-mono text-slate-300">{formatISOTime(endTimeISO)}</p>
        </div>
      </div>

      <div className="relative h-4 w-full rounded-full bg-slate-600">
        {isActive ? (
          <div
            className={`absolute h-full rounded-r-full transition-all duration-1000 ease-linear bg-${TIME_TO_COLOR[compareToCurrentTime(startTimeISO, endTimeISO)]}`}
            style={{
              left: `${percentage}%`,
              right: "0%",
            }}
          />
        ) : (
          <div className="absolute inset-0 rounded-full bg-slate-600" />
        )}

        {isActive ? (
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out"
            style={{ left: `${percentage}%` }}
          >
            <div className="group flex flex-col items-center">
              <div className="rounded-full bg-white p-[2px] shadow-md">
                <IoTime
                  className={`text-${TIME_TO_COLOR[compareToCurrentTime(startTimeISO, endTimeISO)]} text-xl`}
                />
              </div>
            </div>
          </div>
        ) : (
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out"
            style={nowMs > endMs ? { left: "100%" } : { left: "0%" }}
          >
            <div className="group flex flex-col items-center">
              <div className="rounded-full bg-white p-[2px] shadow-md">
                <IoTime className={`text-xl text-slate-600`} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
