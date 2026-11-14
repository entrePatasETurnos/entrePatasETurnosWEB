"use client";

import { useActionState } from "react";
import { DoubleCheckIcon } from "@/components/icons";
import { approveAllAction, type ActionState, type ActionTarget } from "./actions";
import styles from "./admin.module.css";

/** Approves every listed item that the API lets this administrator approve, stays and baths alike. */
export function ApproveAll({ targets, returnTo }: { targets: ActionTarget[]; returnTo: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    approveAllAction.bind(null, targets),
    null,
  );
  const count = targets.length;

  return (
    <form
      action={action}
      className={styles.approveAll}
      onSubmit={(event) => {
        if (!window.confirm(`Aprovar ${count} ${count === 1 ? "pedido" : "pedidos"} desta página?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className={styles.approveButton} disabled={pending}>
        <DoubleCheckIcon size={18} />
        {pending ? "Aprovando…" : `Aprovar todas (${count})`}
      </button>
      {state?.error && (
        <p role="alert" className={styles.actionError}>
          {state.error}
        </p>
      )}
    </form>
  );
}
