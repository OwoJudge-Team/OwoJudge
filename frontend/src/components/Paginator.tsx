"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FaCircleChevronLeft, FaCircleChevronRight } from "react-icons/fa6";

interface PaginatorProps {
  totalCount: number;
  defaultLimit?: number;
}

export default function Paginator({ totalCount, defaultLimit = 20 }: PaginatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const offset = Number(searchParams.get("offset")) || 0;
  const limit = Number(searchParams.get("limit")) || defaultLimit;

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = offset + limit < totalCount;
  const hasPrevPage = offset > 0;

  const createPageURL = (newOffset: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("offset", newOffset.toString());
    params.set("limit", limit.toString());
    return `${pathname}?${params.toString()}`;
  };

  const handlePageChange = (newOffset: number) => {
    router.push(createPageURL(newOffset));
  };

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="inline-flex items-center -space-x-px shadow-sm">
        <button
          onClick={() => handlePageChange(Math.max(0, offset - limit))}
          disabled={!hasPrevPage}
          className="text-3xl font-medium text-slate-300/80 hover:text-slate-400/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <FaCircleChevronLeft />
        </button>
        
        <div className="px-6 py-2 text-sm font-medium text-slate-100">
          Page {currentPage} of {totalPages}
        </div>

        <button
          onClick={() => handlePageChange(offset + limit)}
          disabled={!hasNextPage}
          className="text-3xl font-medium text-slate-300/80 hover:text-slate-400/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <FaCircleChevronRight />
        </button>
      </div>
    </div>
  );
}