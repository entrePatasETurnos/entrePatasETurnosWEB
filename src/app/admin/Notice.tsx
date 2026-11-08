"use client";

import { useEffect, useState } from "react";
import { CheckIcon, XIcon } from "@/components/icons";
import styles from "./admin.module.css";

/**
 * The confirmation after an action. It removes `aviso` from the address bar once shown, so a
 * reload or a shared link does not repeat it, and it can be closed.
 */
export function Notice({ message }: { message: string }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    for (const key of ["aviso", "ok", "total"]) url.searchParams.delete(key);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [message]);

  if (!open) return null;
  return (
    <p role="status" className={styles.notice}>
      <CheckIcon size={18} />
      <span>{message}</span>
      <button type="button" className={styles.noticeClose} onClick={() => setOpen(false)} aria-label="Fechar aviso">
        <XIcon size={16} />
      </button>
    </p>
  );
}
