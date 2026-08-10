import type { TnrStatus } from "@/types/database.types";
import { cn } from "@/lib/utils";
import messages_es from "@/messages/es.json";

const catsT = messages_es.cats as {
  tnrStatusUnaltered: string;
  tnrStatusTrapped: string;
  tnrStatusNeutered: string;
  tnrStatusEartipped: string;
};

const statusMeta: Record<TnrStatus, { label: string; className: string }> = {
  unaltered: {
    label: catsT.tnrStatusUnaltered,
    className: "bg-slate-100 text-slate-700",
  },
  trapped: {
    label: catsT.tnrStatusTrapped,
    className: "bg-amber-100 text-amber-800",
  },
  neutered_spayed: {
    label: catsT.tnrStatusNeutered,
    className: "bg-cyan-100 text-cyan-800",
  },
  eartipped: {
    label: catsT.tnrStatusEartipped,
    className: "bg-teal-100 text-teal-800",
  },
};

export function StatusBadge({ status }: { status: TnrStatus }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold",
        statusMeta[status].className,
      )}
    >
      {statusMeta[status].label}
    </span>
  );
}
