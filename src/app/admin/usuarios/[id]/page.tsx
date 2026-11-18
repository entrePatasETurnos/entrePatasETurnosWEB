import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ArrowLeftIcon } from "@/components/icons";
import { ROLE_LABELS, getMyId, getUser, statusLabel } from "@/lib/admin-users";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { isUserRole } from "@/lib/user-edit";
import { AdminNav } from "../../AdminNav";
import { Notice } from "../../Notice";
import admin from "../../admin.module.css";
import { saveUserAction } from "../actions";
import styles from "../users.module.css";
import { UserEditForm } from "./UserEditForm";

export const metadata: Metadata = { title: "Editar usuário" };

/** /admin/usuarios/{id}: one account's name and profile (spec 010). */
export default function EditUserPage({ params, searchParams }: PageProps<"/admin/usuarios/[id]">) {
  return (
    <>
      <AppHeader area="Painel do administrador · Vicente Pires · Brasília" />
      <AdminNav current="usuarios" />
      <main className={`container ${admin.main}`}>
        <Link href="/admin/usuarios" className={styles.back}>
          <ArrowLeftIcon size={16} /> Usuários
        </Link>
        <Suspense fallback={<Loading />}>
          <EditUser params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function EditUser({
  params,
  searchParams,
}: Pick<PageProps<"/admin/usuarios/[id]">, "params" | "searchParams">) {
  const { token } = await requireRole("ADMINISTRATOR");
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const [user, myId, query] = await Promise.all([getUser(token, id), getMyId(token), searchParams]);
  if (!user) notFound();

  const role = isUserRole(user.role) ? user.role : "CLIENT";
  const isSelf = user.id === myId;

  return (
    <>
      <div className={admin.intro}>
        <span className="eyebrow">{ROLE_LABELS[role]}</span>
        <h1>
          {user.name}
          {isSelf && <span className={styles.you}> (você)</span>}
        </h1>
      </div>

      {query.aviso === "salvo" && <Notice message="Alterações salvas." />}

      <section className={admin.panel} aria-labelledby="dados-usuario">
        <div className={admin.list}>
          <h2 id="dados-usuario" className="visually-hidden">
            Dados de {user.name}
          </h2>
          <dl className={styles.facts}>
            <dt>E-mail</dt>
            <dd>{user.email}</dd>
            <dt>Situação</dt>
            <dd>{statusLabel(user.status)}</dd>
            <dt>Cliente desde</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </dl>
          {/* Keyed by what is saved, so a successful save starts the form afresh. */}
          <UserEditForm
            key={`${user.name}|${role}`}
            user={{ id: user.id, name: user.name, role }}
            isSelf={isSelf}
            action={saveUserAction.bind(null, user.id)}
          />
        </div>
      </section>
    </>
  );
}

function Loading() {
  return (
    <div className={admin.loading} aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Carregando usuário…</span>
      <div className={admin.skeleton} />
      <div className={admin.skeleton} />
    </div>
  );
}
