import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CapIcon, ChatIcon, HomeIcon, ScissorsIcon } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { listMyBookings, type Booking } from "@/lib/bookings";
import { formatDateTime, joinNames, nightsBetween, plural } from "@/lib/format";
import styles from "./tutor.module.css";

export const metadata: Metadata = { title: "Área do tutor" };

const WHATSAPP = "https://wa.me/5561998817120";

const STATUS = {
  registered: { label: "Aguardando aprovação", className: styles.pending },
  approved: { label: "Confirmada", className: styles.ok },
  denied: { label: "Recusada", className: styles.denied },
  completed: { label: "Concluída", className: styles.ok },
} as const;

const services = [
  { title: "Hotel", text: "Hospedagem com rotina estruturada", Icon: HomeIcon },
  { title: "Banho & Tosa", text: "Banho, tosa e cuidados higiênicos", Icon: ScissorsIcon },
  { title: "Adestramento", text: "Aula com o tutor presente", Icon: CapIcon },
];

/** /app: where tutors land after signing in. */
export default function TutorPage() {
  return (
    <>
      <AppHeader area="Área do tutor" />
      <main className={`container ${styles.main}`}>
        <div className={styles.primary}>
          <div className={styles.intro}>
            <span className="eyebrow">Agendar</span>
            <h1>O que o seu cão vai fazer?</h1>
          </div>
          <ul className={styles.services}>
            {services.map(({ title, text, Icon }) => (
              <li key={title} className={styles.service}>
                <span className={styles.serviceIcon}>
                  <Icon size={22} />
                </span>
                <span className={styles.serviceText}>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </span>
              </li>
            ))}
          </ul>
          {/* The online booking form is the next feature to build (POST /v1/accommodation-bookings). */}
          <p className={styles.soon}>
            O agendamento online está chegando. Por enquanto, combine com a gente pelo{" "}
            <a href={WHATSAPP}>WhatsApp</a> e acompanhe as suas reservas aqui.
          </p>
        </div>

        <aside className={styles.aside}>
          <section className={styles.card} aria-labelledby="minhas-reservas">
            <h2 id="minhas-reservas">Minhas reservas</h2>
            <Suspense fallback={<p className={styles.muted}>Carregando…</p>}>
              <MyBookings />
            </Suspense>
          </section>
          <a href={WHATSAPP} className={styles.chat}>
            <ChatIcon size={22} />
            <span>
              <strong>Falar com a equipe</strong>
              <span>Tire dúvidas sobre o seu cão</span>
            </span>
          </a>
        </aside>
      </main>
    </>
  );
}

async function MyBookings() {
  const { token } = await requireRole("CLIENT");
  const { items } = await listMyBookings(token, { size: 10 });

  if (items.length === 0) {
    return <p className={styles.muted}>Você ainda não tem reservas.</p>;
  }
  return (
    <ul className={styles.bookings}>
      {items.map((booking) => (
        <BookingItem key={booking.id} booking={booking} />
      ))}
    </ul>
  );
}

function BookingItem({ booking }: { booking: Booking }) {
  const status = STATUS[booking.status];
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  return (
    <li className={styles.booking}>
      <div className={styles.bookingHead}>
        <strong>
          Hotel · {plural(nights, "noite", "noites")}
        </strong>
        <span className={`${styles.badge} ${status.className}`}>{status.label}</span>
      </div>
      <span>{joinNames(booking.pets.map((pet) => pet.name))}</span>
      <span className={styles.muted}>
        {formatDateTime(booking.checkIn)} → {formatDateTime(booking.checkOut)}
      </span>
      {booking.review?.denialReason && <span className={styles.reason}>Motivo: {booking.review.denialReason}</span>}
    </li>
  );
}
