"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import styles from "./entrar.module.css";

/** The small part of Google Identity Services this page uses. */
type GoogleIdentity = {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        ux_mode?: "popup";
      }): void;
      renderButton(element: HTMLElement, options: Record<string, unknown>): void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const MESSAGES: Record<string, string> = {
  invalid_assertion: "Não conseguimos confirmar a sua conta Google. Tente de novo.",
  account_link_required:
    "Já existe uma conta com este e-mail. Fale com a gente no WhatsApp para vincular o Google a ela.",
  account_unavailable: "Esta conta está desativada. Fale com a nossa equipe.",
  provider_unavailable: "O Google não respondeu agora. Tente novamente em instantes.",
  api_unreachable: "Nosso sistema está fora do ar no momento. Tente novamente em instantes.",
};

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Renders Google's own "Sign in with Google" button. Google gives the browser an ID token; we send
 * it to our route handler, which exchanges it with the API and sets the session cookies.
 */
export function GoogleSignIn() {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const handleCredential = useCallback(
    async ({ credential }: { credential: string }) => {
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: credential }),
        });
        const data: { redirectTo?: string; error?: string } = await response.json().catch(() => ({}));
        if (!response.ok || !data.redirectTo) {
          setError(MESSAGES[data.error ?? ""] ?? "Não foi possível entrar. Tente novamente.");
          setBusy(false);
          return;
        }
        router.replace(data.redirectTo);
      } catch {
        setError(MESSAGES.api_unreachable);
        setBusy(false);
      }
    },
    [router],
  );

  const setUpButton = useCallback(() => {
    if (!CLIENT_ID || !window.google || !buttonRef.current) return;
    window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: handleCredential, ux_mode: "popup" });
    window.google.accounts.id.renderButton(buttonRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      locale: "pt-BR",
      width: 320,
    });
    setReady(true);
  }, [handleCredential]);

  if (!CLIENT_ID) {
    return (
      <p role="alert" className={styles.error}>
        Login indisponível: defina NEXT_PUBLIC_GOOGLE_CLIENT_ID (veja .env.example).
      </p>
    );
  }

  return (
    <div className={styles.google}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={setUpButton}
        onError={() =>
          setError("Não foi possível carregar o login do Google. Verifique a conexão ou desative bloqueadores e recarregue.")
        }
      />
      <div ref={buttonRef} className={styles.googleButton} aria-busy={busy} />
      {!ready && !error && <p className={styles.status}>Carregando o botão do Google…</p>}
      {busy && <p className={styles.status}>Entrando…</p>}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
