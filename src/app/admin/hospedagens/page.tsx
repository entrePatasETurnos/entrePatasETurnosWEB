import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { requireRole } from "@/lib/auth";
import {
  BOOKING_STATUSES,
  countByStatus,
  isBookingStatus,
  listAllBookings,
  type BookingStatus,
} from "@/lib/bookings";
import { AdminNav } from "../AdminNav";
import { ApproveAll } from "../ApproveAll";
import { BookingCard } from "../BookingCard";
import { Notice } from "../Notice";
import { noticeFrom } from "../notices";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Hospedagens" };

const PAGE_SIZE = 20;

const FILTER_LABELS: Record<BookingStatus, string> = {
  registered: "Pendentes",
  approved: "Aprovadas",
  denied: "Recusadas",
  completed: "Concluídas",
};

const EMPTY: Record<BookingStatus, string> = {
  registered: "Nenhuma reserva aguardando aprovação. Tudo em dia!",
  approved: "Nenhuma reserva aprovada no momento.",
  denied: "Nenhuma reserva recusada.",
  completed: "Nenhuma reserva concluída ainda.",
};

/**
 * /admin/hospedagens: every hotel booking, filtered by status and paged. The administrator home
 * (/admin) shows only what is waiting; this page is for browsing everything.
 *
 * The page is split in two: everything static (header shell, title) renders instantly, and the
 * part that needs the session and the API streams in behind <Suspense>.
 */
export default function HospedagensPage({ searchParams }: PageProps<"/admin/hospedagens">) {
  return (
    <>
      <AppHeader area="Painel do administrador · Vicente Pires · Brasília" />
      <AdminNav current="hospedagens" />
      <main className={`container ${styles.main}`}>
        <div className={styles.intro}>
          <span className="eyebrow">Hospedagem</span>
          <h1>Todas as reservas de hotel</h1>
          <p>Filtre por situação para encontrar qualquer reserva.</p>
        </div>
        <Suspense fallback={<LoadingList />}>
          <Requests searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Requests({ searchParams }: { searchParams: PageProps<"/admin/hospedagens">["searchParams"] }) {
  const { token } = await requireRole("ADMINISTRATOR");
  const params = await searchParams;

  const status: BookingStatus = isBookingStatus(params.status) ? params.status : "registered";
  const page = Math.max(0, Number.parseInt(String(params.pagina ?? "0"), 10) || 0);
  const returnTo = `/admin/hospedagens?status=${status}${page ? `&pagina=${page}` : ""}`;

  const [counts, list] = await Promise.all([
    countByStatus(token),
    listAllBookings(token, { status, page, size: PAGE_SIZE }),
  ]);

  const approvable = list.items.filter((booking) => booking._links.approve).map((booking) => booking.id);
  const notice = noticeFrom(params);

  return (
    <>
      <section className={styles.panel} aria-labelledby="lista-reservas">
        <h2 id="lista-reservas" className="visually-hidden">
          Reservas de hospedagem: {FILTER_LABELS[status]}
        </h2>
        <div className={styles.toolbar}>
          <nav className={styles.filters} aria-label="Filtrar por situação">
            {BOOKING_STATUSES.map((value) => (
              <Link
                key={value}
                href={`/admin/hospedagens?status=${value}`}
                className={`${styles.filter} ${value === status ? styles.filterActive : ""}`}
                aria-current={value === status ? "page" : undefined}
              >
                {FILTER_LABELS[value]} <span>{counts[value]}</span>
              </Link>
            ))}
          </nav>
          {approvable.length > 1 && (
            <ApproveAll targets={approvable.map((id) => ({ service: "hotel", id }))} returnTo={returnTo} />
          )}
        </div>

        {notice && <Notice key={notice} message={notice} />}

        <div className={styles.list}>
          {list.items.length === 0 ? (
            <p className={styles.empty}>{EMPTY[status]}</p>
          ) : (
            list.items.map((booking) => <BookingCard key={booking.id} booking={booking} returnTo={returnTo} />)
          )}
        </div>

        {list.page.totalPages > 1 && (
          <nav className={styles.pagination} aria-label="Páginas">
            {page > 0 ? <Link href={`/admin/hospedagens?status=${status}&pagina=${page - 1}`}>← Anteriores</Link> : <span />}
            <span>
              Página {page + 1} de {list.page.totalPages}
            </span>
            {page + 1 < list.page.totalPages ? (
              <Link href={`/admin/hospedagens?status=${status}&pagina=${page + 1}`}>Próximas →</Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </>
  );
}

function LoadingList() {
  return (
    <div className={styles.loading} aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Carregando reservas…</span>
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
    </div>
  );
}
