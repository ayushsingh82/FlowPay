import type { ReactNode } from "react";
import { WalletProviders } from "@/components/app/wallet-providers";

// Scope the Sui wallet providers to the /app route only — the landing page,
// docs, and pitch stay pure static and never load dapp-kit.
export default function AppLayout({ children }: { children: ReactNode }) {
  return <WalletProviders>{children}</WalletProviders>;
}
