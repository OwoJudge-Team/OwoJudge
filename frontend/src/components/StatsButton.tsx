import { BiBarChartAlt2 } from "react-icons/bi";

type StatsButtonProps = {
  onClick: () => void;
  size: "sm" | "lg";
};

const StatsButton: React.FC<StatsButtonProps> = ({ onClick, size }: StatsButtonProps) => {
  return (
    <div
      className="flex cursor-pointer items-center gap-2 rounded-md bg-slate-700/50 px-3 py-1 transition-colors hover:bg-slate-700/80"
      onClick={onClick}
    >
      <BiBarChartAlt2 className={`${size === "sm" ? "text-sm" : "text-lg"} text-green-400/70`} />
      <p className={`${size === "sm" ? "text-sm" : "text-lg"} text-slate-300`}>Stats</p>
    </div>
  );
};

export default StatsButton;
