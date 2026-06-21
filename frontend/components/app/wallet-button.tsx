"use client";

import { useState } from "react";
import { ConnectModal, useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { Wallet, LogOut, ChevronDown } from "lucide-react";

export function WalletButton() {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const [open, setOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (account) {
    const addr = account.address;
    const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`;
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-2 border border-foreground/20 bg-foreground/5 hover:bg-foreground/10 px-3 py-1.5 rounded-lg text-sm font-mono transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-[#CFFF03]" />
          {short}
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-48 border border-foreground/10 bg-background rounded-lg shadow-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-foreground/10">
                <p className="text-xs text-muted-foreground font-mono">Connected</p>
                <p className="text-xs font-mono text-foreground truncate">{short}</p>
              </div>
              <button
                onClick={() => { disconnect(); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <ConnectModal
      trigger={
        <button className="flex items-center gap-2 bg-[#CFFF03] hover:bg-[#CFFF03]/90 text-black px-4 py-1.5 rounded-lg text-sm font-medium transition-all">
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </button>
      }
      open={open}
      onOpenChange={setOpen}
    />
  );
}
