import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { CapIcon, CheckIcon, ClockIcon, HomeIcon, ScissorsIcon } from "@/components/icons";
import { requireRole } from "@/lib/auth";
import { listAllBaths } from "@/lib/baths";
import { listAllBookings } from "@/lib/bookings";
import { entryKey, pendingAcross, toCompleteAcross, type Entry } from "@/lib/pendencies";
import { AdminNav } from "./AdminNav";
import { ApproveAll } from "./ApproveAll";
import { BathCard } from "./BathCard";
import { BookingCard } from "./BookingCard";
import { Notice } from "./Notice";
import { noticeFrom } from "./notices";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Pendências" };

/** The API's largest page. More than this many pending items of one service is shown as "N of M". */
const MAX = 100;
const RETURN_TO = "/admin";

/**
 * /admin: the administrator home. Everything waiting for a decision, hotel stays and baths in one list,
 * soonest first (specs 006 and 007). Browsing every booking lives at /admin/hospedagens.
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
          <p>Tudo o que espera por você, do horário mais próximo para o mais distante.</p>
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

  const [registered, approved, bathsRegistered, bathsApproved] = await Promise.all([
    listAllBookings(token, { status: "registered", size: MAX }),
    listAllBookings(token, { status: "approved", size: MAX }),
    // null when the API has no bath endpoints yet (spec 007 FR-005): baths then stay "em breve".
    listAllBaths(token, { status: "registered", size: MAX }),
    listAllBaths(token, { status: "approved", size: MAX }),
  ]);
  const bathsReady = bathsRegistered !== null && bathsApproved !== null;

  const pending = pendingAcross(registered.items, bathsRegistered?.items ?? [], new Date());
  const closing = toCompleteAcross(approved.items, bathsApproved?.items ?? []);
  const approvable = pending
    .filter((entry) => (entry.service === "hotel" ? entry.booking : entry.appointment)._links.approve)
    .map((entry) => ({
      service: entry.service,
      id: entry.service === "hotel" ? entry.booking.id : entry.appointment.id,
    }));
  const hotelPending = registered.page.totalItems;
  const bathPending = bathsRegistered?.page.totalItems ?? 0;
  const totalPending = hotelPending + bathPending;
  const capped =
    hotelPending > registered.items.length || (bathsRegistered && bathPending > bathsRegistered.items.length);
  const notice = noticeFrom(params);

  return (
    <>
      <ul className={styles.summary} aria-label="Resumo por serviço">
        <li>
          <a href="#aprovar" className={`${styles.summaryCard} ${hotelPending ? styles.summaryHot : ""}`}>
            <span className={styles.summaryIcon}>
              <HomeIcon size={22} />
            </span>
            <span className={styles.summaryText}>
              <strong>{hotelPending}</strong>
              <span>{hotelPending === 1 ? "hospedagem para aprovar" : "hospedagens para aprovar"}</span>
            </span>
          </a>
        </li>
        <li>
          {bathsReady ? (
            <a href="#aprovar" className={`${styles.summaryCard} ${bathPending ? styles.summaryHot : ""}`}>
              <span className={styles.summaryIcon}>
                <ScissorsIcon size={22} />
              </span>
              <span className={styles.summaryText}>
                <strong>{bathPending}</strong>
                <span>{bathPending === 1 ? "banho para aprovar" : "banhos para aprovar"}</span>
              </span>
            </a>
          ) : (
            <div className={`${styles.summaryCard} ${styles.summarySoon}`} aria-disabled="true">
              <span className={styles.summaryIcon}>
                <ScissorsIcon size={22} />
              </span>
              <span className={styles.summaryText}>
                <strong>Em breve</strong>
                <span>banhos para aprovar</span>
              </span>
            </div>
          )}
        </li>
        <li>
          <a href="#concluir" className={styles.summaryCard}>
            <span className={styles.summaryIcon}>
              <ClockIcon size={22} />
            </span>
            <span className={styles.summaryText}>
              <strong>{closing.length}</strong>
              <span>{closing.length === 1 ? "pedido para concluir" : "pedidos para concluir"}</span>
            </span>
          </a>
        </li>
        {/* No training endpoints in the API yet. No numbers until then. */}
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
          {approvable.length > 1 && <ApproveAll targets={approvable} returnTo={RETURN_TO} />}
        </div>
        <div className={styles.list}>
          {pending.length === 0 ? (
            <p className={styles.allClear}>
              <CheckIcon size={20} /> Nenhum pedido esperando aprovação. Tudo em dia!
            </p>
          ) : (
            pending.map((entry) => <EntryCard key={entryKey(entry)} entry={entry} />)
          )}
          {capped && (
            <p className={styles.capped}>
              Mostrando os {pending.length} mais urgentes de {totalPending}.{" "}
              <Link href="/admin/hospedagens?status=registered">Ver todas as hospedagens</Link>
            </p>
          )}
        </div>
      </section>

      <section id="concluir" className={styles.panel} aria-labelledby="titulo-concluir">
        <div className={styles.panelHead}>
          <h2 id="titulo-concluir">
            Para concluir <span className={styles.headCount}>{closing.length}</span>
          </h2>
          <p className={styles.panelHint}>Estadias e banhos aprovados que já terminaram.</p>
        </div>
        <div className={styles.list}>
          {closing.length === 0 ? (
            <p className={styles.allClear}>
              <CheckIcon size={20} /> Nada esperando para ser concluído.
            </p>
          ) : (
            closing.map((entry) => <EntryCard key={entryKey(entry)} entry={entry} />)
          )}
        </div>
      </section>

      <section className={`${styles.panel} ${styles.panelSoon}`} aria-labelledby="titulo-em-breve">
        <div className={styles.panelHead}>
          <h2 id="titulo-em-breve">{bathsReady ? "Adestramento" : "Banho & Tosa e Adestramento"}</h2>
        </div>
        <p className={styles.soonText}>
          {bathsReady
            ? "Os pedidos de aulas vão aparecer aqui, com aprovar e recusar, assim que esse agendamento existir no sistema. Por enquanto, eles são combinados pelo WhatsApp."
            : "Os pedidos de banho e de aulas vão aparecer aqui, com aprovar e recusar, assim que esses agendamentos existirem no sistema. Por enquanto, eles são combinados pelo WhatsApp."}
        </p>
      </section>

      <p className={styles.footerLink}>
        Procurando outra reserva? <Link href="/admin/hospedagens">Ver todas as hospedagens</Link>
      </p>
    </>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  return entry.service === "hotel" ? (
    <BookingCard booking={entry.booking} urgency={entry.urgency} returnTo={RETURN_TO} showService />
  ) : (
    <BathCard appointment={entry.appointment} urgency={entry.urgency} returnTo={RETURN_TO} />
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
