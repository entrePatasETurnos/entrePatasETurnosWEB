import { CalendarIcon, UserIcon } from "@/components/icons";
import type { Booking } from "@/lib/bookings";
import { formatDate, formatDateTime, joinNames, nightsBetween, plural } from "@/lib/format";
import { BookingActions } from "./BookingActions";
import styles from "./admin.module.css";

const STATUS_BADGE = {
  registered: { label: "Pendente", className: styles.badgePending },
  approved: { label: "Aprovada", className: styles.badgeApproved },
  denied: { label: "Recusada", className: styles.badgeDenied },
  completed: { label: "Concluída", className: styles.badgeCompleted },
} as const;

export function BookingCard({ booking, returnTo }: { booking: Booking; returnTo: string }) {
  const petNames = joinNames(booking.pets.map((pet) => pet.name)) || "Pet removido";
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const badge = STATUS_BADGE[booking.status];

  return (
    <article className={styles.card} data-status={booking.status}>
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
        <span className={`${styles.badge} ${badge.className}`}>{badge.label}</span>
        <BookingActions
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
