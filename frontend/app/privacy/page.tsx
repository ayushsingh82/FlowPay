import Link from "next/link";

export const metadata = { title: "Privacy Policy — Vela" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-24">
        <Link href="/" className="text-sm text-white/40 hover:text-white transition-colors mb-12 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-4xl font-display mb-2">Privacy <span className="text-[#B6E324]">Policy</span></h1>
        <p className="text-white/40 text-sm mb-12">Last updated: May 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-white mb-3">1. Overview</h2>
            <p>
              Vela is a non-custodial credit protocol. The smart contracts and frontend do not collect personally
              identifiable information. Wallet addresses are public by virtue of being onchain; nothing else is sent
              to any server operated by Vela. The Helmsman risk agent operates on public chain state.
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
              Interactions with the Vela smart contracts are recorded on Robinhood Chain and are publicly visible on
              the blockchain. The protocol is specifically designed so that these on-chain records reveal no information
              about sender identity, recipient identity, or transaction amounts.
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
              <a href="https://x.com/vela_protocol" className="text-[#B6E324] hover:underline" target="_blank" rel="noopener noreferrer">
                @vela_protocol
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white mb-3">6. Contact</h2>
            <p>
              Questions about this policy? Open an issue on{" "}
              <a href="https://github.com/vela-protocol/vela" className="text-[#B6E324] hover:underline" target="_blank" rel="noopener noreferrer">
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
