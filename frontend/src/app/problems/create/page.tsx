"use client";

import React, { useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiPost } from "@/utils/api";
import Modal from "@/components/Modal";
import { isAdminOrTA } from "@/utils/users";
import ProblemUploadForm, { ProblemUploadFormHandle } from "../components/ProblemUploadForm";

const CreateProblemPage: React.FC = () => {
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

        const res = await apiPost("/api/problems", form);

        if (res.ok) {
          setModalMessage("Problem uploaded successfully!");
        } else {
          let msg = `Upload failed (${res.status})`;
          try {
            const data = await res.text();
            if (data) msg = data;
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
        <h1 className="mb-6 text-2xl font-bold text-slate-100">Create New Problem</h1>
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

export default CreateProblemPage;
