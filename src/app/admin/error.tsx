"use client";

import { useEffect } from "react";

/** Shown instead of an admin page when loading it fails (for example, the API is down). */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container" style={{ paddingBlock: 64, display: "grid", gap: 16, justifyItems: "start" }}>
      <h1 style={{ fontSize: 26 }}>Não foi possível carregar esta página</h1>
      <p>O sistema não respondeu. Verifique se a API está no ar e tente de novo.</p>
      <button
        type="button"
        onClick={reset}
        style={{
          minHeight: 44,
          padding: "0 18px",
          border: 0,
          borderRadius: 12,
          background: "var(--teal-700)",
          color: "var(--cream-50)",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Tentar de novo
      </button>
    </main>
  );
}
