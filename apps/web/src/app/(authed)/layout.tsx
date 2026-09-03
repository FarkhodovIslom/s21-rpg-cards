import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";

export default function AuthedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
