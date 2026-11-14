import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CapIcon, CheckIcon, ClockIcon, HomeIcon, ScissorsIcon } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { listAllBookings } from "@/lib/bookings";
import { pendingByCheckIn, toComplete } from "@/lib/pendencies";
import { AdminNav } from "./AdminNav";
import { ApproveAll } from "./ApproveAll";
import { BookingCard } from "./BookingCard";
import { Notice } from "./Notice";
import { noticeFrom } from "./notices";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Pendências" };

/** The API's largest page. More than this many pending bookings is shown as "100 of N". */
const MAX = 100;
const RETURN_TO = "/admin";

/**
 * /admin: the administrator home. Everything waiting for a decision, across services, most urgent
 * first (specs/006-admin-home). Browsing every booking lives at /admin/hospedagens.
 */
export default function AdminHome({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <AppHeader area="Painel do administrador · Vicente Pires · Brasília" />
      <AdminNav current="inicio" />
      <main className={`container ${styles.main}`}>
        <div className={styles.intro}>
          <span className="eyebrow">Início</span>
          <h1>Pendências</h1>
          <p>Tudo o que espera por você, do check-in mais próximo para o mais distante.</p>
        </div>
        <Suspense fallback={<Loading />}>
          <Pending searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Pending({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const { token } = await requireRole("ADMINISTRATOR");
  const params = await searchParams;

  const [registered, approved] = await Promise.all([
    listAllBookings(token, { status: "registered", size: MAX }),
    listAllBookings(token, { status: "approved", size: MAX }),
  ]);

  const pending = pendingByCheckIn(registered.items, new Date());
  const closing = toComplete(approved.items);
  const approvable = pending.filter((item) => item.booking._links.approve).map((item) => item.booking.id);
  const totalPending = registered.page.totalItems;
  const notice = noticeFrom(params);

  return (
    <>
      <ul className={styles.summary} aria-label="Resumo por serviço">
        <li>
          <a href="#aprovar" className={`${styles.summaryCard} ${totalPending ? styles.summaryHot : ""}`}>
            <span className={styles.summaryIcon}>
              <HomeIcon size={22} />
            </span>
            <span className={styles.summaryText}>
              <strong>{totalPending}</strong>
              <span>{totalPending === 1 ? "hospedagem para aprovar" : "hospedagens para aprovar"}</span>
            </span>
          </a>
        </li>
        <li>
          <a href="#concluir" className={styles.summaryCard}>
            <span className={styles.summaryIcon}>
              <ClockIcon size={22} />
            </span>
            <span className={styles.summaryText}>
              <strong>{closing.length}</strong>
              <span>{closing.length === 1 ? "estadia para concluir" : "estadias para concluir"}</span>
            </span>
          </a>
        </li>
        {/* No bath or training endpoints in the API yet (bath: API spec 032). No numbers until then. */}
        <li>
          <div className={`${styles.summaryCard} ${styles.summarySoon}`} aria-disabled="true">
            <span className={styles.summaryIcon}>
              <ScissorsIcon size={22} />
            </span>
            <span className={styles.summaryText}>
              <strong>Em breve</strong>
              <span>banhos para aprovar</span>
            </span>
          </div>
        </li>
        <li>
          <div className={`${styles.summaryCard} ${styles.summarySoon}`} aria-disabled="true">
            <span className={styles.summaryIcon}>
              <CapIcon size={22} />
            </span>
            <span className={styles.summaryText}>
              <strong>Em breve</strong>
              <span>aulas para aprovar</span>
            </span>
          </div>
        </li>
      </ul>

      {notice && <Notice key={notice} message={notice} />}

      <section id="aprovar" className={styles.panel} aria-labelledby="titulo-aprovar">
        <div className={styles.panelHead}>
          <h2 id="titulo-aprovar">
            Para aprovar <span className={styles.headCount}>{totalPending}</span>
          </h2>
          {approvable.length > 1 && <ApproveAll ids={approvable} returnTo={RETURN_TO} />}
        </div>
        <div className={styles.list}>
          {pending.length === 0 ? (
            <p className={styles.allClear}>
              <CheckIcon size={20} /> Nenhuma hospedagem esperando aprovação. Tudo em dia!
            </p>
          ) : (
            pending.map(({ booking, urgency }) => (
              <BookingCard key={booking.id} booking={booking} urgency={urgency} returnTo={RETURN_TO} />
            ))
          )}
          {totalPending > pending.length && (
            <p className={styles.capped}>
              Mostrando as {pending.length} mais urgentes de {totalPending}.{" "}
              <Link href="/admin/hospedagens?status=registered">Ver todas</Link>
            </p>
          )}
        </div>
      </section>

      <section id="concluir" className={styles.panel} aria-labelledby="titulo-concluir">
        <div className={styles.panelHead}>
          <h2 id="titulo-concluir">
            Para concluir <span className={styles.headCount}>{closing.length}</span>
          </h2>
          <p className={styles.panelHint}>Estadias aprovadas cujo check-out já passou.</p>
        </div>
        <div className={styles.list}>
          {closing.length === 0 ? (
            <p className={styles.allClear}>
              <CheckIcon size={20} /> Nenhuma estadia esperando para ser concluída.
            </p>
          ) : (
            closing.map((booking) => <BookingCard key={booking.id} booking={booking} returnTo={RETURN_TO} />)
          )}
        </div>
      </section>

      <section className={`${styles.panel} ${styles.panelSoon}`} aria-labelledby="titulo-banho">
        <div className={styles.panelHead}>
          <h2 id="titulo-banho">Banho &amp; Tosa e Adestramento</h2>
        </div>
        <p className={styles.soonText}>
          Os pedidos de banho e de aulas vão aparecer aqui, com aprovar e recusar, assim que esses
          agendamentos existirem no sistema. Por enquanto, eles são combinados pelo WhatsApp.
        </p>
      </section>

      <p className={styles.footerLink}>
        Procurando outra reserva? <Link href="/admin/hospedagens">Ver todas as hospedagens</Link>
      </p>
    </>
  );
}

function Loading() {
  return (
    <div className={styles.loading} aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Carregando pendências…</span>
      <div className={styles.skeletonRow}>
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
    </div>
  );
}

