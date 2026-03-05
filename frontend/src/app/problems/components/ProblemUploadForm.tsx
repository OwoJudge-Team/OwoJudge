"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { FaArrowUpFromBracket } from "react-icons/fa6";
import { LuLoaderCircle } from "react-icons/lu";

export type ProblemUploadFormHandle = {
  fileRef: React.RefObject<File | null>;
  clear: () => void;
};

export type ProblemFormProps = {
  onSubmit: (e: React.FormEvent) => void;
  loading?: boolean;
};

const ProblemUploadForm = forwardRef<ProblemUploadFormHandle, ProblemFormProps>(
  ({ onSubmit, loading = false }, ref) => {
    const internalFileRef = useRef<File | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        fileRef: internalFileRef,
        clear: () => {
          internalFileRef.current = null;
          setFileName(null);
          if (inputRef.current) inputRef.current.value = "";
        },
      }),
      []
    );

    const handleBoxClick = () => inputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files && e.target.files[0];
      if (f) {
        internalFileRef.current = f;
        setFileName(f.name);
      }
    };

    return (
      <form onSubmit={onSubmit} className="flex w-full flex-col items-center">
        <input
          type="file"
          ref={inputRef}
          onChange={handleFileChange}
          accept=".tar.gz"
          className="hidden"
        />

        <div
          onClick={handleBoxClick}
          className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-4 border-dashed border-slate-500 transition-colors hover:bg-slate-700/60"
        >
          <FaArrowUpFromBracket className="mb-6 text-6xl text-slate-500" />
          <p className="text-lg text-slate-400">{fileName ?? "Upload .tar.gz file"}</p>
        </div>
        {loading ? (
          <LuLoaderCircle className="mb-2 mt-6 animate-spin text-4xl text-indigo-500" />
        ) : (
          <button
            type="submit"
            className="mt-6 rounded-lg bg-indigo-600 px-10 py-2 text-xl text-slate-100 transition-all hover:bg-indigo-500"
          >
            Submit
          </button>
        )}
      </form>
    );
  }
);

ProblemUploadForm.displayName = "ProblemUploadForm";
export default ProblemUploadForm;
