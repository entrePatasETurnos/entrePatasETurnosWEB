import { CalendarIcon, ScissorsIcon, UserIcon } from "@/components/icons";
import type { BathAppointment } from "@/lib/baths";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";
import type { Urgency } from "@/lib/pendencies";
import { BookingActions } from "./BookingActions";
import styles from "./admin.module.css";

const STATUS_BADGE = {
  registered: { label: "Pendente", className: styles.badgePending },
  approved: { label: "Aprovado", className: styles.badgeApproved },
  denied: { label: "Recusado", className: styles.badgeDenied },
  completed: { label: "Concluído", className: styles.badgeCompleted },
} as const;

const URGENCY_BADGE = {
  overdue: { label: "Horário já passou", className: styles.badgeOverdue },
  soon: { label: "Em menos de 48 h", className: styles.badgeSoon },
} as const;

/** One bath appointment (API spec 032), laid out like a stay so a mixed list reads as one. */
export function BathCard({
  appointment,
  returnTo,
  urgency = null,
}: {
  appointment: BathAppointment;
  returnTo: string;
  urgency?: Urgency;
}) {
  const petName = appointment.pet?.name ?? "Pet removido";
  const minutes = Math.round((Date.parse(appointment.endsAt) - Date.parse(appointment.startsAt)) / 60_000);
  const length = minutes % 60 === 0 ? `${minutes / 60} h` : `${minutes} min`;
  const badge = STATUS_BADGE[appointment.status];
  const urgent = urgency ? URGENCY_BADGE[urgency] : null;

  return (
    <article className={styles.card} data-status={appointment.status} data-urgency={urgency ?? undefined}>
      <div className={styles.who}>
        <span className={styles.avatar} aria-hidden="true">
          {petName.charAt(0)}
        </span>
        <div>
          <h3>{petName}</h3>
          <span className={styles.owner}>
            <UserIcon size={14} /> Tutor nº {appointment.ownerId}
          </span>
        </div>
      </div>

      <div className={styles.details}>
        <span className={styles.when}>
          <CalendarIcon size={16} />
          {formatDateTime(appointment.startsAt)} → {formatTime(appointment.endsAt)}
        </span>
        <span>Banho · {length}</span>
        {appointment.review?.denialReason && (
          <span className={styles.reason}>Motivo: {appointment.review.denialReason}</span>
        )}
        <span className={styles.meta}>Solicitado em {formatDate(appointment.createdAt)}</span>
      </div>

      <div className={styles.side}>
        <span className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeService}`}>
            <ScissorsIcon size={12} /> Banho
          </span>
          {urgent && <span className={`${styles.badge} ${urgent.className}`}>{urgent.label}</span>}
          <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
        </span>
        {appointment.status === "registered" && !appointment._links.approve && !appointment._links.deny && (
          // The API omits the review links on a bath for the administrator's own pet (no self-review).
          <span className={styles.ownNote}>Pet seu: outro administrador precisa revisar.</span>
        )}
        <BookingActions
          service="bath"
          id={appointment.id}
          petNames={petName}
          returnTo={returnTo}
          canApprove={Boolean(appointment._links.approve)}
          canDeny={Boolean(appointment._links.deny)}
          canComplete={Boolean(appointment._links.complete)}
        />
      </div>
    </article>
  );
}
