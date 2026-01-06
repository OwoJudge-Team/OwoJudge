"use client";

import React, { useState, useRef, useEffect } from "react";
import { HiCalendar, HiClock, HiChevronLeft, HiChevronRight, HiCheck } from "react-icons/hi2";

interface DateTimePickerProps {
  value: string; // ISO String
  onChange: (isoString: string) => void;
}

export default function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse the current value, fallback to now
  const selectedDate = value ? new Date(value) : new Date();

  // View state determines which month/year the calendar grid is displaying
  const [viewDate, setViewDate] = useState(new Date(selectedDate.getTime()));

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Calendar Math
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const updateDate = (updates: {
    d?: number;
    m?: number;
    y?: number;
    h?: number;
    min?: number;
  }) => {
    const next = new Date(selectedDate.getTime());

    if (updates.y !== undefined) next.setFullYear(updates.y);
    if (updates.m !== undefined) next.setMonth(updates.m);
    if (updates.d !== undefined) next.setDate(updates.d);
    if (updates.h !== undefined) next.setHours(updates.h);
    if (updates.min !== undefined) next.setMinutes(updates.min);

    onChange(next.toISOString());
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      month === selectedDate.getMonth() &&
      year === selectedDate.getFullYear()
    );
  };

  return (
    <div className="relative w-full font-sans" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded bg-slate-700 px-4 py-3 text-left transition-all hover:border-indigo-400"
      >
        <div className="flex flex-row items-center gap-4">
          <span className="text-sm font-semibold text-slate-300">
            {selectedDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="text-xs font-medium text-slate-400">
            {selectedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <HiCalendar className="text-xl text-gray-400" />
      </button>

      {/* Picker Dropdown */}
      {isOpen && (
        <div className="animate-in fade-in zoom-in-95 absolute bottom-full z-50 mb-2 w-full min-w-[300px] rounded-2xl border border-slate-700 bg-slate-800 p-4 shadow-2xl duration-200">
          {/* Month Navigation */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-slate-200">
              {viewDate.toLocaleString("default", { month: "long" })} {year}
            </h3>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="rounded-lg p-1.5 hover:bg-slate-300"
              >
                <HiChevronLeft />
              </button>
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="rounded-lg p-1.5 hover:bg-slate-300"
              >
                <HiChevronRight />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="mb-1 grid grid-cols-7 gap-px text-center">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <span key={d} className="py-1 text-[10px] font-bold uppercase text-slate-400">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {padding.map((i) => (
              <div key={`p-${i}`} />
            ))}
            {days.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => updateDate({ d, m: month, y: year })}
                className={`rounded-lg py-1.5 text-sm transition-all ${
                  isSelected(d)
                    ? "bg-indigo-600 font-bold text-slate-100"
                    : "text-slate-400 hover:bg-blue-50"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="my-4 border-t border-slate-700" />

          {/* Time Picker Row */}
          <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-700 p-2">
            <div className="flex items-center gap-2 pl-2">
              <HiClock className="text-slate-400" />
              <span className="text-[10px] font-bold uppercase text-slate-400">Time</span>
            </div>
            <div className="flex items-center gap-1 font-mono font-bold text-slate-700">
              <select
                value={selectedDate.getHours()}
                onChange={(e) => updateDate({ h: parseInt(e.target.value) })}
                className="cursor-pointer appearance-none bg-transparent text-slate-200 outline-none focus:bg-slate-600"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>
              <span className="text-slate-200">:</span>
              <select
                value={selectedDate.getMinutes()}
                onChange={(e) => updateDate({ min: parseInt(e.target.value) })}
                className="cursor-pointer appearance-none bg-transparent text-slate-200 outline-none focus:bg-slate-600"
              >
                {Array.from({ length: 60 }).map((_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-sm font-bold text-slate-100 shadow-lg transition-all hover:bg-indigo-700"
          >
            <HiCheck /> Confirm
          </button>
        </div>
      )}
    </div>
  );
}
