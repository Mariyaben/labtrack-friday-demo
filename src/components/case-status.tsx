import { Check, Circle, CircleDashed, Diamond } from "lucide-react";
import { statuses, type CaseStatus } from "@/lib/domain";

const stageIcons = {
  received: Circle,
  in_progress: CircleDashed,
  quality_check: Diamond,
  ready: Check,
};

export function CaseStatusLabel({ status }: { status: CaseStatus }) {
  const Icon = stageIcons[status];
  return (
    <span className="production-status" data-status={status}>
      <Icon size={12} strokeWidth={1.8} aria-hidden="true" />
      {statuses[status]}
    </span>
  );
}
