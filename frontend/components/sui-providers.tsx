"use client";

import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SuiClientProvider, WalletProvider, createNetworkConfig } from "@mysten/dapp-kit";
import { getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { registerSlushWallet, SLUSH_WALLET_NAME } from "@mysten/slush-wallet";

const queryClient = new QueryClient();

const { networkConfig } = createNetworkConfig({
  testnet: { url: getJsonRpcFullnodeUrl("testnet"), network: "testnet" },
});

function SlushRegistrar() {
  useEffect(() => {
    registerSlushWallet("FlowPay", {
      origin: "https://slush.app",
    });
  }, []);
  return null;
}

export function SuiProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect preferredWallets={[SLUSH_WALLET_NAME]}>
          <SlushRegistrar />
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
