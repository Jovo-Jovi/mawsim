import { Suspense, type ReactNode } from "react";

export default function UnknownPathLayout({ children }: { children: ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
