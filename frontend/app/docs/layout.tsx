import { DocsShell } from "./_components/shell";

export const metadata = {
  title: "FlowPay · Docs",
  description:
    "FlowPay protocol documentation — a consumer multi-asset payment wallet on Sui with Scallop yield and DeepBook routing in one atomic PTB.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <DocsShell>{children}</DocsShell>;
}
