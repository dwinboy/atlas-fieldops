import { ClipboardList, ArrowUpLeft, Timer, ShieldCheck } from 'lucide-react';

interface IconProps {
  className?: string;
}

export function PendingReviewIcon({ className }: IconProps) {
  return <ClipboardList className={className} />;
}

export function AwaitingCorrectionIcon({ className }: IconProps) {
  return <ArrowUpLeft className={className} />;
}

export function TimerIcon({ className }: IconProps) {
  return <Timer className={className} />;
}

export function VerifiedIcon({ className }: IconProps) {
  return <ShieldCheck className={className} />;
}
