"use client";

import { useActionState, useState } from "react";
import { CheckIcon, XIcon } from "@/components/icons";
import { approveAction, completeAction, denyAction, type ActionState } from "./actions";
import styles from "./admin.module.css";

type Props = {
  id: number;
  petNames: string;
  returnTo: string;
  canApprove: boolean;
  canDeny: boolean;
  canComplete: boolean;
};

/** The buttons on one booking. Which ones appear is decided by the API's links (see bookings.ts). */
export function BookingActions({ id, petNames, returnTo, canApprove, canDeny, canComplete }: Props) {
  const [denyOpen, setDenyOpen] = useState(false);
  // `bind` fixes the booking id; the form supplies the rest.
  const [approveState, approve, approving] = useActionState<ActionState, FormData>(approveAction.bind(null, id), null);
  const [denyState, deny, denying] = useActionState<ActionState, FormData>(denyAction.bind(null, id), null);
  const [completeState, complete, completing] = useActionState<ActionState, FormData>(
    completeAction.bind(null, id),
    null,
  );

  const error = approveState?.error ?? denyState?.error ?? completeState?.error;
  const busy = approving || denying || completing;

  if (!canApprove && !canDeny && !canComplete) return null;

  return (
    <div className={styles.actions}>
      {denyOpen ? (
        <form action={deny} className={styles.denyForm}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <label htmlFor={`reason-${id}`}>Motivo da recusa (o tutor vai ver)</label>
          <textarea
            id={`reason-${id}`}
            name="reason"
            required
            maxLength={1000}
            rows={3}
            placeholder="Ex.: Sem vagas para cães grandes nessa semana"
          />
          <div className={styles.buttonRow}>
            <button type="button" className={styles.ghostButton} onClick={() => setDenyOpen(false)} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className={styles.rejectButton} disabled={busy}>
              <XIcon size={16} /> {denying ? "Recusando…" : "Confirmar recusa"}
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.buttonRow}>
          {canDeny && (
            <button
              type="button"
              className={styles.rejectButton}
              onClick={() => setDenyOpen(true)}
              disabled={busy}
              aria-label={`Recusar a reserva de ${petNames}`}
            >
              <XIcon size={16} /> Recusar
            </button>
          )}
          {canApprove && (
            <form action={approve}>
              <input type="hidden" name="returnTo" value={returnTo} />
              <button
                type="submit"
                className={styles.approveButton}
                disabled={busy}
                aria-label={`Aprovar a reserva de ${petNames}`}
              >
                <CheckIcon size={16} /> {approving ? "Aprovando…" : "Aprovar"}
              </button>
            </form>
          )}
          {canComplete && (
            <form action={complete}>
              <input type="hidden" name="returnTo" value={returnTo} />
              <button type="submit" className={styles.approveButton} disabled={busy}>
                <CheckIcon size={16} /> {completing ? "Concluindo…" : "Marcar como concluída"}
              </button>
            </form>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className={styles.actionError}>
          {error}
        </p>
      )}
    </div>
  );
}
