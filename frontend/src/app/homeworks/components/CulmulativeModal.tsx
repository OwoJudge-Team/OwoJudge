"use client";

import React, { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { IoClose, IoStatsChart, IoAnalytics } from "react-icons/io5";

interface Props {
  data: number[];
  isOpen: boolean;
  onClose: () => void;
}

const CumulativeModal = ({ data, isOpen, onClose }: Props) => {
  const [isCumulative, setIsCumulative] = useState(true);

  const chartData = useMemo(() => {
    const freqMap: Record<number, number> = {};
    data.forEach((num) => {
      freqMap[num] = (freqMap[num] || 0) + 1;
    });

    const sortedKeys = Object.keys(freqMap)
      .map(Number)
      .sort((a, b) => a - b);

    let runningTotal = 0;
    return sortedKeys.map((val) => {
      const count = freqMap[val];
      runningTotal += count;
      return {
        val,
        displayValue: isCumulative ? runningTotal : count,
      };
    });
  }, [data, isCumulative]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />

      <div className="animate-in zoom-in-95 relative w-full max-w-4xl overflow-hidden rounded-3xl bg-slate-900 shadow-2xl duration-300">
        <div className="flex flex-col justify-between p-8 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-indigo-50 bg-indigo-900/30 p-3">
              <IoAnalytics className="text-2xl text-indigo-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-100">Score Distribution</h3>
              <p className="text-sm text-slate-500">Analyzing {data.length} scored entrants</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute right-6 top-6 p-2 text-slate-400 transition-colors hover:text-slate-200"
          >
            <IoClose size={28} />
          </button>
        </div>

        <div className="ml-8 flex w-fit items-center gap-2 rounded-xl bg-slate-800 p-1">
          <button
            onClick={() => setIsCumulative(false)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              !isCumulative ? "bg-slate-700 text-indigo-500 shadow-sm" : "text-slate-500"
            }`}
          >
            <IoStatsChart /> Frequency
          </button>
          <button
            onClick={() => setIsCumulative(true)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all ${
              isCumulative ? "bg-slate-700 text-indigo-500 shadow-sm" : "text-slate-500"
            }`}
          >
            <IoAnalytics /> Cumulative
          </button>
        </div>

        <div className="h-[25rem] p-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -20 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="val" tick={{ fill: "#64748b" }} />
              <YAxis tick={{ fill: "#64748b" }} />
              <Tooltip
                cursor={{ stroke: "#6366f1", strokeWidth: 2 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs text-slate-100 shadow-xl">
                        <p className="mb-1 border-b border-slate-600 pb-1 font-bold">
                          Score: {payload[0].payload.val}
                        </p>
                        <p>
                          {isCumulative ? "Cumulative Count" : "Occurrences"}: {payload[0].value}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="displayValue"
                stroke="#6366f1"
                strokeWidth={3}
                fill="url(#grad)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CumulativeModal;
