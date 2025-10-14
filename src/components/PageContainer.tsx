import type { ReactNode } from "react";

export const PageContainer = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 ${className ?? ""}`}>
    {children}
  </div>
);
