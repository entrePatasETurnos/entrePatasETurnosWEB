"use client";

import { useActionState } from "react";
import { DoubleCheckIcon } from "@/components/icons";
import { approveAllAction, type ActionState } from "./actions";
import styles from "./admin.module.css";

export function ApproveAll({ ids, returnTo }: { ids: number[]; returnTo: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(approveAllAction.bind(null, ids), null);

  return (
    <form
      action={action}
      className={styles.approveAll}
      onSubmit={(event) => {
        if (!window.confirm(`Aprovar ${ids.length} ${ids.length === 1 ? "reserva" : "reservas"} desta página?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className={styles.approveButton} disabled={pending}>
        <DoubleCheckIcon size={18} />
        {pending ? "Aprovando…" : `Aprovar todas (${ids.length})`}
      </button>
      {state?.error && (
        <p role="alert" className={styles.actionError}>
          {state.error}
        </p>
      )}
    </form>
  );
}
