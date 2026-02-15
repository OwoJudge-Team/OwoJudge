"use client";

import React, { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiPut } from "@/utils/api";
import Modal from "@/components/Modal";
import { isAdminOrTA } from "@/utils/users";
import ProblemUploadForm, { ProblemUploadFormHandle } from "../../components";
import { TiArrowBack } from "react-icons/ti";
import { useParams } from "next/dist/client/components/navigation";

const UpdateProblemPage: React.FC = () => {
  const params = useParams();
  const id = params.id;
  const uploadRef = useRef<ProblemUploadFormHandle | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = uploadRef.current?.fileRef.current;
    if (file) {
      setLoading(true);
      try {
        const form = new FormData();
        form.append("problem", file);

        const res = await apiPut(`/api/problems/${id}`, form);

        if (res.ok) {
          setModalMessage(`Problem #${id} updated successfully!`);
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

  if (!user || !isAdminOrTA(user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-lg text-slate-300">Access denied. Admins only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-row items-center justify-between">
          <h1 className="mb-6 text-2xl font-bold text-slate-100">Update Problem #{id}</h1>
          <a
            href={`/problems/${id}`}
            className="group flex items-center rounded-lg bg-indigo-600 px-2 py-1 text-sm text-slate-100 transition-all"
            aria-label={`Back to Problem ${id}`}
          >
            <TiArrowBack />
            <span className="inline-block max-w-0 -translate-x-1 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-xs group-hover:translate-x-0 group-hover:opacity-100">
              Back to Problem #{id}
            </span>
          </a>
        </div>
        <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800 p-4 shadow-sm">
          <ProblemUploadForm ref={uploadRef} onSubmit={handleSubmit} loading={loading} />

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

export default UpdateProblemPage;
