import { Badge } from "@/components/ui/badge";

/** Honest "this is a simulation" label, shown in the app header. */
export function DemoBadge() {
  return (
    <Badge
      variant="outline"
      className="border-[#CFFF03]/30 bg-[#CFFF03]/5 text-[#CFFF03] font-mono text-[10px] tracking-wide gap-1.5"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#CFFF03] opacity-60" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#CFFF03]" />
      </span>
      DEMO · TESTNET MOCK · SIMULATED DATA
    </Badge>
  );
}
