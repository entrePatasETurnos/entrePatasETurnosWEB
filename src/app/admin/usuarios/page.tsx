import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getMyId, listUsers } from "@/lib/admin-users";
import { requireRole } from "@/lib/auth";
import {
  ROLE_LABELS,
  STATUS_FILTERS,
  USER_ROLES,
  isUserRole,
  parsePage,
  parseRoleFilter,
  parseStatusFilter,
  statusLabel,
  type UserRole,
  type UserStatusFilter,
} from "@/lib/user-edit";
import { AdminNav } from "../AdminNav";
import admin from "../admin.module.css";
import { saveUserRowAction } from "./actions";
import { UserList } from "./UserList";
import styles from "./users.module.css";

export const metadata: Metadata = { title: "Usuários" };

const PAGE_SIZE = 20;

type Filters = { perfil?: UserRole; situacao?: UserStatusFilter };

/** `/admin/usuarios` with the given filters and page; page 0 and absent filters are left out. */
function listHref(filters: Filters, page = 0): string {
  const query = new URLSearchParams();
  if (filters.perfil) query.set("perfil", filters.perfil);
  if (filters.situacao) query.set("situacao", filters.situacao);
  if (page) query.set("pagina", String(page));
  const text = query.toString();
  return `/admin/usuarios${text ? `?${text}` : ""}`;
}

/**
 * /admin/usuarios: every account from the API (spec 011), filterable by profile and status and paged.
 * Each row edits its account's name and profile in place.
 */
export default function UsuariosPage({ searchParams }: PageProps<"/admin/usuarios">) {
  return (
    <>
      <AppHeader area="Painel do administrador · Vicente Pires · Brasília" />
      <AdminNav current="usuarios" />
      <main className={`container ${admin.main}`}>
        <div className={admin.intro}>
          <span className="eyebrow">Usuários</span>
          <h1>Usuários</h1>
          <p>Corrija o nome ou mude o perfil de qualquer pessoa direto na lista.</p>
        </div>
        <Suspense fallback={<LoadingRows />}>
          <Users searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Users({ searchParams }: { searchParams: PageProps<"/admin/usuarios">["searchParams"] }) {
  const { token } = await requireRole("ADMINISTRATOR");
  const params = await searchParams;
  const filters: Filters = { perfil: parseRoleFilter(params.perfil), situacao: parseStatusFilter(params.situacao) };
  const filtered = Boolean(filters.perfil || filters.situacao);
  const page = parsePage(params.pagina);

  const [list, myId] = await Promise.all([
    listUsers(token, { role: filters.perfil, status: filters.situacao, page, size: PAGE_SIZE }),
    getMyId(token),
  ]);

  const users = list.items.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: isUserRole(user.role) ? user.role : "CLIENT",
    status: user.status,
  }));
  const actions = Object.fromEntries(users.map((user) => [user.id, saveUserRowAction.bind(null, user.id)]));
  const totalPages = list.page.totalPages;

  return (
    <section className={admin.panel} aria-labelledby="lista-usuarios">
      <h2 id="lista-usuarios" className="visually-hidden">
        {filtered ? "Usuários filtrados" : "Todos os usuários"}
      </h2>
      <div className={admin.list}>
        <form action="/admin/usuarios" method="get" className={styles.filters} aria-label="Filtrar usuários">
          <div className={styles.filterField}>
            <label htmlFor="perfil">Perfil</label>
            <select id="perfil" name="perfil" defaultValue={filters.perfil ?? ""} className={styles.input}>
              <option value="">Todos</option>
              {USER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterField}>
            <label htmlFor="situacao">Situação</label>
            <select id="situacao" name="situacao" defaultValue={filters.situacao ?? ""} className={styles.input}>
              <option value="">Todas</option>
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={styles.button}>
            Filtrar
          </button>
          {filtered && (
            <Link href="/admin/usuarios" className={styles.clear}>
              Limpar filtros
            </Link>
          )}
        </form>

        {users.length === 0 ? (
          <EmptyState page={page} filtered={filtered} filters={filters} />
        ) : (
          <UserList users={users} myId={myId} actions={actions} />
        )}
      </div>

      {totalPages > 1 && users.length > 0 && (
        <nav className={admin.pagination} aria-label="Páginas">
          {page > 0 ? <Link href={listHref(filters, page - 1)}>← Anteriores</Link> : <span />}
          <span>
            Página {page + 1} de {totalPages}
          </span>
          {page + 1 < totalPages ? <Link href={listHref(filters, page + 1)}>Próximas →</Link> : <span />}
        </nav>
      )}
    </section>
  );
}

function EmptyState({ page, filtered, filters }: { page: number; filtered: boolean; filters: Filters }) {
  if (page > 0) {
    return (
      <p className={admin.empty}>
        Esta página não existe. <Link href={listHref(filters)}>Voltar à primeira página</Link>
      </p>
    );
  }
  if (filtered) {
    return (
      <p className={admin.empty}>
        Nenhum usuário com esses filtros. <Link href="/admin/usuarios">Limpar filtros</Link>
      </p>
    );
  }
  return <p className={admin.empty}>Nenhum usuário cadastrado.</p>;
}

function LoadingRows() {
  return (
    <div className={admin.loading} aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Carregando usuários…</span>
      <div className={admin.skeleton} />
      <div className={admin.skeleton} />
      <div className={admin.skeleton} />
    </div>
  );
}
