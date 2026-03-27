import { LuLoaderCircle } from "react-icons/lu";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  onConfirm?: () => void;
  confirm?: boolean;
  loading?: boolean;
  buttonStyle?: "danger" | "safe";
  textStyle?: "log" | "normal";
}

export default function Modal({
  isOpen,
  onClose,
  message,
  onConfirm,
  confirm,
  loading,
  buttonStyle = "safe",
  textStyle = "normal",
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-sm transform rounded-lg bg-slate-800 p-6 shadow-xl transition-all">
        <div className="flex flex-col items-center">
          <h3 className="text-center text-lg font-medium text-slate-300/60">Notification</h3>
          <div className="my-6">
            {loading ? (
              <LuLoaderCircle className="mb-2 mt-6 animate-spin text-4xl text-indigo-500" />
            ) : textStyle === "log" ? (
              <pre className="whitespace-pre-wrap text-left text-sm text-slate-100">{message}</pre>
            ) : (
              <p className="text-md whitespace-pre-line text-center text-slate-100">{message}</p>
            )}
          </div>
        </div>

        {!loading && (
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-slate-100 shadow-sm hover:bg-indigo-700 focus:outline-none"
            >
              Close
            </button>

            {confirm && onConfirm && (
              <button
                onClick={onConfirm}
                className={`ml-4 inline-flex justify-center rounded-md border border-transparent ${buttonStyle === "danger" ? "bg-rose-600" : "bg-green-700"} px-4 py-2 text-base font-medium text-slate-100 shadow-sm ${buttonStyle === "danger" ? "hover:bg-rose-700" : "hover:bg-green-800"} focus:outline-none`}
              >
                Confirm
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
