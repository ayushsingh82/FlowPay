import Link from "next/link";

export const metadata = { title: "Privacy Policy — FlowPay" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <Link href="/" className="text-sm text-white/40 hover:text-white transition-colors mb-12 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-4xl font-display mb-2">Privacy <span className="text-[#BE185D]">Policy</span></h1>
        <p className="text-white/40 text-sm mb-12">Last updated: May 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-white mb-3">1. Overview</h2>
            <p>
              FlowPay is a non-custodial, multi-asset payment wallet on Sui. The smart contracts and frontend do not
              collect personally identifiable information. Wallet addresses are public by virtue of being onchain;
              nothing else is sent to any server operated by FlowPay. The off-chain route and risk agent operates on
              public chain state.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">2. Information we do not collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Wallet addresses or private keys</li>
              <li>Transaction amounts or token balances</li>
              <li>IP addresses or device fingerprints</li>
              <li>Names, emails, or any identity data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">3. On-chain data</h2>
            <p>
              Interactions with the FlowPay smart contracts are recorded on Sui and are publicly visible on the
              blockchain. Like any onchain payment, a spend emits a public event (the paying address, the asset
              routed, the merchant, and the amount). FlowPay does not add any identity layer on top of this — we never
              link an onchain address to a real-world identity, and we operate no server that records your activity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">4. Third-party services</h2>
            <p>
              The frontend may load assets from third-party CDNs (fonts, images). These providers operate under their
              own privacy policies. We do not share any user data with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">5. Changes</h2>
            <p>
              We may update this policy as the protocol evolves. Material changes will be announced via our official
              Twitter account{" "}
              <a href="https://x.com/flowpay" className="text-[#BE185D] hover:underline" target="_blank" rel="noopener noreferrer">
                @flowpay
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">6. Contact</h2>
            <p>
              Questions about this policy? Open an issue on{" "}
              <a href="https://github.com/flowpay/flowpay" className="text-[#BE185D] hover:underline" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
