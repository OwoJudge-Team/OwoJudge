export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 shadow-xl">
      <div className="border-b border-slate-700 bg-slate-800/50 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-100">{title}</h2>
      </div>
      <div className="space-y-5 p-6">{children}</div>
    </div>
  );
}

type LabeledInputProps = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  value: string;
  onChange?: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  disabled?: boolean;
  placeholder?: string;
  title?: string;
  required?: boolean;
  rows?: number;
};

const inputBase =
  "w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50";

const inputDisabled =
  "w-full cursor-not-allowed rounded-lg border border-slate-600 bg-slate-900/30 px-4 py-2.5 text-sm text-slate-400 focus:outline-none";

export function LabeledInput({
  id,
  label,
  icon,
  value,
  onChange,
  type = "text",
  disabled,
  placeholder,
  title,
  required,
  rows,
}: LabeledInputProps) {
  const commonProps = {
    id,
    value,
    title,
    placeholder,
    required,
    disabled,
    className: disabled ? inputDisabled : inputBase,
    onChange: onChange
      ? (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)
      : undefined,
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"
      >
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
        {required && (
          <span className="ml-auto">
            <span className="text-xs text-rose-400">* Required</span>
          </span>
        )}
      </label>

      {rows ? <textarea {...commonProps} rows={rows} /> : <input {...commonProps} type={type} />}
    </div>
  );
}
