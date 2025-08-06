"use client";

import React from "react";
import AuthSessionProvider from "./AuthSessionProvider";
import AuthButton from "./AuthButton";

/**
 * Client-only shell:
 * - NextAuth SessionProvider
 * - Global AuthButton
 * - Children (app content)
 */
export default function LayoutClientShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthSessionProvider>
      <div className="fixed top-3 right-3 z-50">
        <AuthButton />
      </div>
      {children}
    </AuthSessionProvider>
  );
}
