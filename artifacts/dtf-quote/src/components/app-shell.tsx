import React from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/navbar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location] = useLocation();
  const isLanding = location === "/";
  const isAuth = location === "/auth";

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="glass-app-root">
      <div className="auth-blobs" aria-hidden="true">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
        <div className="auth-blob auth-blob-3" />
        <div className="auth-blob auth-blob-4" />
      </div>

      <svg className="auth-noise" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <filter id="app-noise-f">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#app-noise-f)" />
      </svg>

      <div className="relative z-10 flex flex-col h-[100dvh]">
        {!isAuth && (
          <Navbar isLanding={isLanding} onScrollTo={isLanding ? scrollTo : undefined} />
        )}

        <main className={`flex-1 overflow-y-auto custom-scrollbar scroll-smooth ${isLanding ? "pb-20 sm:pb-0" : ""}`}>
          <div key={location} className="animate-page-in min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
