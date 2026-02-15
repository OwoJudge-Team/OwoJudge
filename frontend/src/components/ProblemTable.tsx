import { FaChartPie, FaInfinity, FaStar, FaUserGroup } from "react-icons/fa6";
import CoolLink from "./cool-link";
import { Problem } from "@/types/problems";

const ProblemTable = ({
  showCreateProblem,
  problems,
}: {
  showCreateProblem: boolean;
  problems: Problem[];
}) => {
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-slate-700 bg-slate-800/50">
          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            ID
          </th>
          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Problem
          </th>
          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Quota
          </th>
          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Score
          </th>
          <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            AC / Tried
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-700/50">
        {showCreateProblem && (
          <tr>
            <td className="px-6 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border-[3px] border-dashed border-slate-700/60 text-sm font-semibold text-slate-300">
                +
              </div>
            </td>
            <td className="px-6 py-4">
              <CoolLink href={`/problems/create`} text="Create New Problem" />
            </td>
            <td className="px-6 py-4">
              <span className="inline-flex items-center gap-1.5 rounded-lg border-[3px] border-dashed border-blue-800/50 px-3 py-1.5 text-sm font-medium text-blue-200">
                <FaChartPie /> ?
              </span>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 items-center gap-1 rounded-lg border-[3px] border-dashed border-amber-800/50 px-3 text-sm font-semibold text-amber-200">
                  <FaStar /> ?
                </div>
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <FaUserGroup /> ? / ?
              </div>
            </td>
          </tr>
        )}
        {problems.map((p) => (
          <tr
            key={p.serialNumber}
            className="group transition-all duration-150 hover:bg-slate-700/50"
          >
            <td className="px-6 py-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/60 text-sm font-semibold text-slate-300">
                {p.serialNumber}
              </div>
            </td>
            <td className="px-6 py-4">
              <CoolLink href={`/problems/${p.serialNumber}`} text={p.title} />
            </td>
            <td className="px-6 py-4">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800/50 px-3 py-1.5 text-sm font-medium text-blue-200">
                <FaChartPie />
                {p.dailyQuota !== undefined ? p.dailyQuota : <FaInfinity />}
              </span>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 items-center gap-1 rounded-lg bg-amber-800/50 px-3 text-sm font-semibold text-amber-200">
                  <FaStar />
                  {p.fullScore}
                </div>
              </div>
            </td>
            <td className="px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <FaUserGroup />
                {p.userDetail.solved} / {p.userDetail.attempted}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ProblemTable;
