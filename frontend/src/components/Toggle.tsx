interface ToggleProps {
  enabled: boolean;
  onClick: () => void;
}

export default function Toggle({ enabled, onClick }: ToggleProps) {
  return (
    <button
      onClick={() => onClick()}
      className={`${
        enabled ? "bg-indigo-500" : "bg-slate-500"
      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
    >
      <span
        className={`${
          enabled ? "translate-x-6" : "translate-x-1"
        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
      />
    </button>
  );
}
