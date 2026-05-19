import { DocsShell } from "./_components/shell";

export const metadata = {
  title: "Vela · Docs",
  description:
    "Vela protocol documentation — stock-collateralized credit lines on Robinhood Chain.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <DocsShell>{children}</DocsShell>;
}
