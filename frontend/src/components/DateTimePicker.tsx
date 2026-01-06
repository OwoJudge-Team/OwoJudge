"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  HiCalendar, 
  HiClock, 
  HiChevronLeft, 
  HiChevronRight, 
  HiCheck 
} from "react-icons/hi2";

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

  const updateDate = (updates: { d?: number; m?: number; y?: number; h?: number; min?: number }) => {
    const next = new Date(selectedDate.getTime());
    
    if (updates.y !== undefined) next.setFullYear(updates.y);
    if (updates.m !== undefined) next.setMonth(updates.m);
    if (updates.d !== undefined) next.setDate(updates.d);
    if (updates.h !== undefined) next.setHours(updates.h);
    if (updates.min !== undefined) next.setMinutes(updates.min);
    
    onChange(next.toISOString());
  };

  const isSelected = (day: number) => {
    return day === selectedDate.getDate() && 
           month === selectedDate.getMonth() && 
           year === selectedDate.getFullYear();
  };

  return (
    <div className="relative w-full font-sans" ref={containerRef}>
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 bg-slate-700 rounded hover:border-indigo-400 transition-all text-left"
      >
        <div className="flex flex-row items-center gap-4">
          <span className="text-sm font-semibold text-slate-300">
            {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <HiCalendar className="text-gray-400 text-xl" />
      </button>

      {/* Picker Dropdown */}
      {isOpen && (
        <div className="absolute z-50 bottom-full mb-2 w-full min-w-[300px] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-200">
              {viewDate.toLocaleString('default', { month: 'long' })} {year}
            </h3>
            <div className="flex gap-1">
              <button 
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="p-1.5 hover:bg-slate-300 rounded-lg"
              ><HiChevronLeft /></button>
              <button 
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="p-1.5 hover:bg-slate-300 rounded-lg"
              ><HiChevronRight /></button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px text-center mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <span key={d} className="text-[10px] font-bold text-slate-400 uppercase py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {padding.map(i => <div key={`p-${i}`} />)}
            {days.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => updateDate({ d, m: month, y: year })}
                className={`py-1.5 text-sm rounded-lg transition-all ${
                  isSelected(d) 
                  ? "bg-indigo-600 text-slate-100 font-bold" 
                  : "text-slate-400 hover:bg-blue-50"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="my-4 border-t border-slate-700" />

          {/* Time Picker Row */}
          <div className="flex items-center justify-between bg-slate-700 rounded-xl p-2 mb-4">
            <div className="flex items-center gap-2 pl-2">
              <HiClock className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Time</span>
            </div>
            <div className="flex items-center gap-1 font-mono font-bold text-slate-700">
              <select 
                value={selectedDate.getHours()} 
                onChange={(e) => updateDate({ h: parseInt(e.target.value) })}
                className="bg-transparent appearance-none cursor-pointer outline-none text-slate-200 focus:bg-slate-600"
              >
                {Array.from({length: 24}).map((_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-slate-200">:</span>
              <select 
                value={selectedDate.getMinutes()} 
                onChange={(e) => updateDate({ min: parseInt(e.target.value) })}
                className="bg-transparent appearance-none cursor-pointer outline-none text-slate-200 focus:bg-slate-600"
              >
                {Array.from({length: 60}).map((_, i) => (
                  <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Close Button */}
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full py-2 bg-indigo-600 text-slate-100 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg transition-all"
          >
            <HiCheck /> Confirm
          </button>
        </div>
      )}
    </div>
  );
}