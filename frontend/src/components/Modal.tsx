// components/Modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
}

export default function Modal({ isOpen, onClose, message }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
        onClick={onClose}
      />

      <div className="relative bg-slate-800 rounded-lg shadow-xl max-w-sm w-full p-6 transform transition-all">
        <div className="text-center">
          <h3 className="text-lg font-medium text-slate-300/60">
            Notification
          </h3>
          <div className="my-6">
            <p className="text-md text-slate-100">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-slate-100 hover:bg-indigo-700 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}