"use client";

import { FaCircleChevronLeft, FaCircleChevronRight } from "react-icons/fa6";

interface PaginatorProps {
  totalCount: number;
  limit: number;
  offset: number;
  onChange: (newOffset: number, newLimit?: number) => void;
}

export default function Paginator({ totalCount, limit, offset, onChange }: PaginatorProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const hasNextPage = offset + limit < totalCount;
  const hasPrevPage = offset > 0;

  const handlePageChange = (newOffset: number) => {
    onChange(newOffset);
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = Number(e.target.value);
    onChange(0, newLimit);
  };

  return (
    <div className="grid w-full grid-cols-3 py-8">
      <div></div>
      <div className="inline-flex items-center -space-x-px justify-self-center shadow-sm">
        <button
          onClick={() => handlePageChange(Math.max(0, offset - limit))}
          disabled={!hasPrevPage}
          className="text-3xl font-medium text-slate-300/80 transition-colors hover:text-slate-400/80 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <FaCircleChevronLeft />
        </button>

        <div className="px-6 py-2 text-sm font-medium text-slate-100">
          Page {currentPage} of {totalPages}
        </div>

        <button
          onClick={() => handlePageChange(offset + limit)}
          disabled={!hasNextPage}
          className="text-3xl font-medium text-slate-300/80 transition-colors hover:text-slate-400/80 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <FaCircleChevronRight />
        </button>
      </div>
      <div className="flex items-center gap-2 justify-self-end">
        <label className="text-sm text-slate-300">Per page:</label>
        <select
          value={limit}
          onChange={handleLimitChange}
          className="rounded bg-slate-800 p-1 text-slate-100"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
    </div>
  );
}
