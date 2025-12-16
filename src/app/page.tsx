"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [Desktop, setDesktop] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    console.warn("[Home] Mounting, importing Desktop...");
    import("@/components/Desktop")
      .then((mod) => {
        console.warn("[Home] Desktop imported successfully");
        setDesktop(() => mod.default);
      })
      .catch((err) => {
        console.error("[Home] Failed to import Desktop:", err);
      });
  }, []);

  if (!Desktop) {
    return (
      <div className="os9-desktop flex items-center justify-center">
        <div className="loading-overlay" style={{ background: "transparent" }}>
          <div className="loading-spinner" />
          <span>Loading Photo Booth...</span>
        </div>
      </div>
    );
  }

  return <Desktop />;
}
