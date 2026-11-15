"use client";

import { useActionState, useState } from "react";
import { CheckIcon, XIcon } from "@/components/icons";
import type { Service } from "@/lib/pendencies";
import { approveAction, completeAction, denyAction, type ActionState } from "./actions";
import styles from "./admin.module.css";

/** How each service names its item in labels read aloud and on buttons. */
const WORDING: Record<Service, { item: string; done: string; example: string }> = {
  hotel: { item: "a reserva de", done: "Marcar como concluída", example: "Sem vagas para cães grandes nessa semana" },
  bath: { item: "o banho de", done: "Marcar como concluído", example: "Sem banhista nesse horário" },
};

type Props = {
  /** Which API the item belongs to; picks the endpoints the actions call. */
  service: Service;
  id: number;
  petNames: string;
  returnTo: string;
  canApprove: boolean;
  canDeny: boolean;
  canComplete: boolean;
};

/** The buttons on one stay or bath. Which ones appear is decided by the API's links (see bookings.ts). */
export function BookingActions({ service, id, petNames, returnTo, canApprove, canDeny, canComplete }: Props) {
  const words = WORDING[service];
  const [denyOpen, setDenyOpen] = useState(false);
  // `bind` fixes the service and the id; the form supplies the rest.
  const [approveState, approve, approving] = useActionState<ActionState, FormData>(
    approveAction.bind(null, service, id),
    null,
  );
  const [denyState, deny, denying] = useActionState<ActionState, FormData>(denyAction.bind(null, service, id), null);
  const [completeState, complete, completing] = useActionState<ActionState, FormData>(
    completeAction.bind(null, service, id),
    null,
  );
  const reasonId = `reason-${service}-${id}`;

  const error = approveState?.error ?? denyState?.error ?? completeState?.error;
  const busy = approving || denying || completing;

  if (!canApprove && !canDeny && !canComplete) return null;

  return (
    <div className={styles.actions}>
      {denyOpen ? (
        <form action={deny} className={styles.denyForm}>
          <input type="hidden" name="returnTo" value={returnTo} />
          <label htmlFor={reasonId}>Motivo da recusa (o tutor vai ver)</label>
          <textarea
            id={reasonId}
            name="reason"
            required
            maxLength={1000}
            rows={3}
            placeholder={`Ex.: ${words.example}`}
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
              aria-label={`Recusar ${words.item} ${petNames}`}
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
                aria-label={`Aprovar ${words.item} ${petNames}`}
              >
                <CheckIcon size={16} /> {approving ? "Aprovando…" : "Aprovar"}
              </button>
            </form>
          )}
          {canComplete && (
            <form action={complete}>
              <input type="hidden" name="returnTo" value={returnTo} />
              <button type="submit" className={styles.approveButton} disabled={busy}>
                <CheckIcon size={16} /> {completing ? "Concluindo…" : words.done}
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
