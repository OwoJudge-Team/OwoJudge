"use client";

import React, { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FaArrowUpFromBracket } from "react-icons/fa6";
import { apiPost } from "@/utils/api";
import { LuLoaderCircle } from "react-icons/lu";
import Modal from "@/components/Modal";

const CreateProblemPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleBoxClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      setLoading(true);
      try {
        const form = new FormData();
        form.append("problem", file);

        const res = await apiPost("/api/problems", form);

        if (res.ok) {
          setModalMessage("Problem uploaded successfully!");
        } else {
          let msg = `Upload failed (${res.status})`;
          try {
            const data = await res.json();
            if (data && data.message) msg = data.message;
          } catch {}
          setModalMessage(msg);
        }
      } catch {
        setModalMessage("An error occurred while uploading the problem.");
      } finally {
        setLoading(false);
        setIsModalOpen(true);
      }
    } else {
      setModalMessage("Please select a .tar.gz file to upload.");
      setIsModalOpen(true);
    }
  };

  if (!user || !user.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-lg text-slate-300">Access denied. Admins only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-slate-100">Create New Problem</h1>
        <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".tar.gz"
              className="hidden"
            />

            <div
              onClick={handleBoxClick}
              className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-4 border-dashed border-slate-500 transition-colors hover:bg-slate-700/60"
            >
              <FaArrowUpFromBracket className="mb-6 text-6xl text-slate-500" />
              <p className="text-lg text-slate-400">{file ? file.name : "Upload .tar.gz file"}</p>
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

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            message={modalMessage}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateProblemPage;
