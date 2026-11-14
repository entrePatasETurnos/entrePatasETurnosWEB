import { CalendarIcon, HomeIcon, UserIcon } from "@/components/icons";
import type { Booking } from "@/lib/bookings";
import { formatDate, formatDateTime, joinNames, nightsBetween, plural } from "@/lib/format";
import type { Urgency } from "@/lib/pendencies";
import { BookingActions } from "./BookingActions";
import styles from "./admin.module.css";

const STATUS_BADGE = {
  registered: { label: "Pendente", className: styles.badgePending },
  approved: { label: "Aprovada", className: styles.badgeApproved },
  denied: { label: "Recusada", className: styles.badgeDenied },
  completed: { label: "Concluída", className: styles.badgeCompleted },
} as const;

const URGENCY_BADGE = {
  overdue: { label: "Check-in já passou", className: styles.badgeOverdue },
  soon: { label: "Check-in em menos de 48 h", className: styles.badgeSoon },
} as const;

type Props = {
  booking: Booking;
  returnTo: string;
  /** Set on the administrator home, where pending bookings are ordered by how soon they start. */
  urgency?: Urgency;
  /** Labels the card "Hotel": needed where stays and baths share one list. */
  showService?: boolean;
};

export function BookingCard({ booking, returnTo, urgency = null, showService = false }: Props) {
  const petNames = joinNames(booking.pets.map((pet) => pet.name)) || "Pet removido";
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const badge = STATUS_BADGE[booking.status];
  const urgent = urgency ? URGENCY_BADGE[urgency] : null;

  return (
    <article className={styles.card} data-status={booking.status} data-urgency={urgency ?? undefined}>
      <div className={styles.who}>
        <span className={styles.avatar} aria-hidden="true">
          {petNames.charAt(0)}
        </span>
        <div>
          <h3>{petNames}</h3>
          {/* The API sends only the owner's id, never a name or e-mail (privacy by design). */}
          <span className={styles.owner}>
            <UserIcon size={14} /> Tutor nº {booking.ownerId}
          </span>
        </div>
      </div>

      <div className={styles.details}>
        <span className={styles.when}>
          <CalendarIcon size={16} />
          {formatDateTime(booking.checkIn)} → {formatDateTime(booking.checkOut)}
        </span>
        <span>
          Hospedagem · {plural(nights, "noite", "noites")} · {plural(booking.pets.length, "pet", "pets")}
        </span>
        {booking.review?.denialReason && <span className={styles.reason}>Motivo: {booking.review.denialReason}</span>}
        <span className={styles.meta}>Solicitada em {formatDate(booking.createdAt)}</span>
      </div>

      <div className={styles.side}>
        <span className={styles.badges}>
          {showService && (
            <span className={`${styles.badge} ${styles.badgeService}`}>
              <HomeIcon size={12} /> Hotel
            </span>
          )}
          {urgent && <span className={`${styles.badge} ${urgent.className}`}>{urgent.label}</span>}
          <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
        </span>
        {booking.status === "registered" && !booking._links.approve && !booking._links.deny && (
          // The API omits the review links on an administrator's own booking (no self-review).
          <span className={styles.ownNote}>Reserva sua: outro administrador precisa revisar.</span>
        )}
        <BookingActions
          service="hotel"
          id={booking.id}
          petNames={petNames}
          returnTo={returnTo}
          canApprove={Boolean(booking._links.approve)}
          canDeny={Boolean(booking._links.deny)}
          canComplete={Boolean(booking._links.complete)}
        />
      </div>
    </article>
  );
}
