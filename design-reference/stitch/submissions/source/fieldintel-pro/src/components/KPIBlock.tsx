import { PendingReviewIcon, AwaitingCorrectionIcon, TimerIcon, VerifiedIcon } from './KPICardIcons';

interface KPIBlockProps {
  pendingReviewCount: number;
  awaitingCorrectionCount: number;
  avgReviewTime: number;
  qualityScore: number;
}

export default function KPIBlock({
  pendingReviewCount,
  awaitingCorrectionCount,
  avgReviewTime,
  qualityScore,
}: KPIBlockProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Pending Review Card */}
      <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100 transition-colors">
            <PendingReviewIcon className="w-6 h-6" />
          </div>
          <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-[10px] font-bold">
            +12% vs last week
          </span>
        </div>
        <div>
          <p className="text-on-surface-variant font-semibold text-xs mb-1 uppercase tracking-wider">
            Pending Review
          </p>
          <p className="text-4xl font-extrabold text-on-surface tracking-tight">
            {pendingReviewCount}
          </p>
        </div>
      </div>

      {/* Awaiting Correction Card */}
      <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-error-container text-error rounded-lg group-hover:bg-red-100 transition-colors">
            <AwaitingCorrectionIcon className="w-6 h-6" />
          </div>
          <span className="text-error bg-error-container px-2 py-0.5 rounded text-[10px] font-bold">
            -4% improvement
          </span>
        </div>
        <div>
          <p className="text-on-surface-variant font-semibold text-xs mb-1 uppercase tracking-wider">
            Awaiting Correction
          </p>
          <p className="text-4xl font-extrabold text-on-surface tracking-tight">
            {awaitingCorrectionCount}
          </p>
        </div>
      </div>

      {/* Average Review Time Card */}
      <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-secondary-container text-secondary rounded-lg group-hover:bg-teal-100 transition-colors">
            <TimerIcon className="w-6 h-6" />
          </div>
          <span className="text-secondary bg-secondary-container px-2 py-0.5 rounded text-[10px] font-bold">
            Target &lt; 2h
          </span>
        </div>
        <div>
          <p className="text-on-surface-variant font-semibold text-xs mb-1 uppercase tracking-wider">
            Avg. Review Time
          </p>
          <p className="text-4xl font-extrabold text-on-surface tracking-tight">
            {avgReviewTime.toFixed(1)}h
          </p>
        </div>
      </div>

      {/* Quality Score Card */}
      <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-primary-fixed-dim text-primary rounded-lg group-hover:bg-green-100 transition-colors">
            <VerifiedIcon className="w-6 h-6" />
          </div>
          <span className="text-primary bg-primary-fixed px-2 py-0.5 rounded text-[10px] font-bold">
            99th Percentile
          </span>
        </div>
        <div>
          <p className="text-on-surface-variant font-semibold text-xs mb-1 uppercase tracking-wider">
            Quality Score
          </p>
          <p className="text-4xl font-extrabold text-on-surface tracking-tight">
            {qualityScore}%
          </p>
        </div>
      </div>
    </div>
  );
}
