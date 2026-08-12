import { notFound } from "next/navigation";
import { isDevPreviewEnabled } from "@/lib/dev-preview";

export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isDevPreviewEnabled()) notFound();
  return children;
}
