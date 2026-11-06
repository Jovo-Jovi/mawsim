import { Suspense, type ReactNode } from "react";

export default function ProduceSlugLayout({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
