import type { AssetSymbol } from "@/lib/flowpay-demo";

function SuiIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#4DA2FF" />
      {/* Sui S-wave mark */}
      <path d="M12 25 C15 22 18 20 20 21 C22 22 25 20 28 17"
        stroke="white" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M12 15 C15 18 18 20 20 19 C22 18 25 20 28 23"
        stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeOpacity="0.55" />
    </svg>
  );
}

function UsdcIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#2775CA" />
      <circle cx="20" cy="20" r="13.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.35" />
      {/* $ sign: vertical bar + two S-curves */}
      <line x1="20" y1="10" x2="20" y2="30" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.6" />
      <path d="M 24.5 14.5 C 24.5 12 15.5 12 15.5 17 C 15.5 22 24.5 18 24.5 23 C 24.5 28 15.5 28 15.5 25.5"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function BtcIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#F7931A" />
      {/* ₿ glyph approximated with paths */}
      <path d="M15 11 L15 29 M15 20 L15 20" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 11 L22 11 C25 11 27 13 27 15.5 C27 18 25 19 22 19 L17 19"
        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M17 19 L23 19 C26 19 28 21 28 23.5 C28 26 26 29 23 29 L17 29"
        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line x1="13" y1="13" x2="17" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="27" x2="17" y2="27" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EthIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#627EEA" />
      {/* Ethereum diamond: top triangle + bottom triangle */}
      <polygon points="20,8 29,20 20,24 11,20" fill="white" fillOpacity="0.92" />
      <polygon points="20,27 29,20 20,33 11,20" fill="white" fillOpacity="0.48" />
    </svg>
  );
}

function DeepIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="#0A0F1E" />
      {/* Order-book bars (ask side) */}
      <rect x="11" y="14" width="18" height="2.5" rx="1.25" fill="#CFFF03" fillOpacity="0.95" />
      <rect x="11" y="19" width="14" height="2.5" rx="1.25" fill="#CFFF03" fillOpacity="0.6" />
      <rect x="11" y="24" width="9" height="2.5" rx="1.25" fill="#CFFF03" fillOpacity="0.3" />
    </svg>
  );
}

const ICONS: Record<AssetSymbol, (size: number) => React.ReactElement> = {
  SUI:  (s) => <SuiIcon size={s} />,
  USDC: (s) => <UsdcIcon size={s} />,
  BTC:  (s) => <BtcIcon size={s} />,
  ETH:  (s) => <EthIcon size={s} />,
};

export function TokenIcon({ symbol, size = 36 }: { symbol: AssetSymbol; size?: number }) {
  const render = ICONS[symbol];
  if (render) return render(size);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="20" fill="#333" />
      <text x="20" y="25" textAnchor="middle" fill="white" fontSize="12" fontFamily="monospace">
        {symbol.slice(0, 2)}
      </text>
    </svg>
  );
}

export function DeepTokenIcon({ size = 36 }: { size?: number }) {
  return <DeepIcon size={size} />;
}
