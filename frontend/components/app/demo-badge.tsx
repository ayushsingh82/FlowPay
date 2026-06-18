import { Badge } from "@/components/ui/badge";

/** Honest "this is a simulation" label, shown in the app header. */
export function DemoBadge() {
  return (
    <Badge
      variant="outline"
      className="border-[#BE185D]/30 bg-[#BE185D]/5 text-[#BE185D] font-mono text-[10px] tracking-wide gap-1.5"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#BE185D] opacity-60" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#BE185D]" />
      </span>
      DEMO · TESTNET MOCK · SIMULATED DATA
    </Badge>
  );
}
