import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CapIcon, HomeIcon, ScissorsIcon } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import {
  BOOKING_STATUSES,
  countByStatus,
  isBookingStatus,
  listAllBookings,
  type BookingStatus,
} from "@/lib/bookings";
import { plural } from "@/lib/format";
import { ApproveAll } from "./ApproveAll";
import { BookingCard } from "./BookingCard";
import { Notice } from "./Notice";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Painel do administrador" };

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
 * /admin: administrators approve, deny and complete hotel bookings.
 *
 * The page is split in two: everything static (header shell, title) renders instantly, and the
 * part that needs the session and the API streams in behind <Suspense>.
 */
export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <AppHeader area="Painel do administrador · Vicente Pires · Brasília" />
      <main className={`container ${styles.main}`}>
        <div className={styles.intro}>
          <span className="eyebrow">Aprovações</span>
          <h1>Solicitações dos tutores</h1>
          <p>Revise as reservas antes de confirmar com o tutor.</p>
        </div>
        <Suspense fallback={<LoadingList />}>
          <Requests searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Requests({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const { token } = await requireRole("ADMINISTRATOR");
  const params = await searchParams;

  const status: BookingStatus = isBookingStatus(params.status) ? params.status : "registered";
  const page = Math.max(0, Number.parseInt(String(params.pagina ?? "0"), 10) || 0);
  const returnTo = `/admin?status=${status}${page ? `&pagina=${page}` : ""}`;

  const [counts, list] = await Promise.all([
    countByStatus(token),
    listAllBookings(token, { status, page, size: PAGE_SIZE }),
  ]);

  const approvable = list.items.filter((booking) => booking._links.approve).map((booking) => booking.id);
  const notice = noticeFrom(params);

  return (
    <>
      <div className={styles.tabs} aria-label="Serviços">
        <div className={`${styles.tab} ${styles.tabActive}`} aria-current="page">
          <span className={styles.tabIcon}>
            <HomeIcon size={24} />
          </span>
          <span className={styles.tabText}>
            <strong>Hospedagem</strong>
            <span>
              {counts.registered === 0
                ? "Tudo em dia"
                : plural(counts.registered, "aguardando aprovação", "aguardando aprovação")}
            </span>
          </span>
          <span className={`${styles.count} ${counts.registered ? styles.countHot : ""}`}>{counts.registered}</span>
        </div>
        {/* The API has no bath or training bookings yet. These become real tabs when it does. */}
        <div className={styles.tab} aria-disabled="true">
          <span className={styles.tabIcon}>
            <ScissorsIcon size={24} />
          </span>
          <span className={styles.tabText}>
            <strong>Banho &amp; Tosa</strong>
            <span>Em breve</span>
          </span>
        </div>
        <div className={styles.tab} aria-disabled="true">
          <span className={styles.tabIcon}>
            <CapIcon size={24} />
          </span>
          <span className={styles.tabText}>
            <strong>Adestramento</strong>
            <span>Em breve</span>
          </span>
        </div>
      </div>

      <section className={styles.panel} aria-labelledby="lista-reservas">
        <h2 id="lista-reservas" className="visually-hidden">
          Reservas de hospedagem: {FILTER_LABELS[status]}
        </h2>
        <div className={styles.toolbar}>
          <nav className={styles.filters} aria-label="Filtrar por situação">
            {BOOKING_STATUSES.map((value) => (
              <Link
                key={value}
                href={`/admin?status=${value}`}
                className={`${styles.filter} ${value === status ? styles.filterActive : ""}`}
                aria-current={value === status ? "page" : undefined}
              >
                {FILTER_LABELS[value]} <span>{counts[value]}</span>
              </Link>
            ))}
          </nav>
          {approvable.length > 1 && <ApproveAll ids={approvable} returnTo={returnTo} />}
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
            {page > 0 ? <Link href={`/admin?status=${status}&pagina=${page - 1}`}>← Anteriores</Link> : <span />}
            <span>
              Página {page + 1} de {list.page.totalPages}
            </span>
            {page + 1 < list.page.totalPages ? (
              <Link href={`/admin?status=${status}&pagina=${page + 1}`}>Próximas →</Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </>
  );
}

/** The confirmation shown after an action (the action redirects here with `aviso=...`). */
function noticeFrom(params: Record<string, string | string[] | undefined>) {
  switch (params.aviso) {
    case "aprovada":
      return "Reserva aprovada. O tutor já vê a confirmação na área dele.";
    case "recusada":
      return "Reserva recusada. O tutor vê o motivo na área dele.";
    case "concluida":
      return "Reserva marcada como concluída.";
    case "lote": {
      const ok = Number(params.ok) || 0;
      const total = Number(params.total) || 0;
      return ok === total
        ? `${plural(ok, "reserva aprovada", "reservas aprovadas")}.`
        : `${ok} de ${total} reservas aprovadas. As outras continuam pendentes: abra cada uma para ver o motivo.`;
    }
    default:
      return null;
  }
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
