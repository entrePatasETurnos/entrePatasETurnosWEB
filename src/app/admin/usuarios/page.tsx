import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ROLE_LABELS, getMyId, listUsers, statusLabel } from "@/lib/admin-users";
import { requireRole } from "@/lib/auth";
import { normalizeSearch, parsePage, SEARCH_MAX_LENGTH } from "@/lib/user-edit";
import { AdminNav } from "../AdminNav";
import admin from "../admin.module.css";
import styles from "./users.module.css";

export const metadata: Metadata = { title: "Usuários" };

const PAGE_SIZE = 20;

/**
 * /admin/usuarios: every account, searchable by name or e-mail and paged (spec 010). Each row opens the
 * edit screen, where the name and the profile are changed.
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
          <p>Encontre uma pessoa para corrigir o nome ou mudar o perfil.</p>
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
  const busca = normalizeSearch(params.busca);
  const page = parsePage(params.pagina);

  const [list, myId] = await Promise.all([
    listUsers(token, { q: busca || undefined, page, size: PAGE_SIZE }),
    getMyId(token),
  ]);

  if (!list) {
    return (
      <section className={admin.panel} aria-labelledby="usuarios-em-breve">
        <h2 id="usuarios-em-breve" className="visually-hidden">
          Usuários
        </h2>
        <p className={admin.empty}>Gerenciar usuários estará disponível em breve.</p>
      </section>
    );
  }

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (busca) query.set("busca", busca);
    if (target) query.set("pagina", String(target));
    const text = query.toString();
    return `/admin/usuarios${text ? `?${text}` : ""}`;
  };

  return (
    <section className={admin.panel} aria-labelledby="lista-usuarios">
      <h2 id="lista-usuarios" className="visually-hidden">
        {busca ? `Usuários encontrados para “${busca}”` : "Todos os usuários"}
      </h2>
      <div className={admin.list}>
        <form action="/admin/usuarios" method="get" role="search" className={styles.search}>
          <div className={styles.searchField}>
            <label htmlFor="busca">Buscar por nome ou e-mail</label>
            <input
              id="busca"
              name="busca"
              type="search"
              defaultValue={busca}
              maxLength={SEARCH_MAX_LENGTH}
              autoComplete="off"
              className={styles.input}
            />
          </div>
          <button type="submit" className={styles.button}>
            Buscar
          </button>
          {busca && (
            <Link href="/admin/usuarios" className={styles.clear}>
              Limpar busca
            </Link>
          )}
        </form>

        {list.items.length === 0 ? (
          <p className={admin.empty}>
            {busca ? `Nenhum usuário encontrado para “${busca}”.` : "Nenhum usuário cadastrado."}
          </p>
        ) : (
          <ul className={styles.rows}>
            {list.items.map((user) => (
              <li key={user.id}>
                <Link href={`/admin/usuarios/${user.id}`} className={styles.row}>
                  <span className={styles.rowName}>
                    {user.name}
                    {user.id === myId && <span className={styles.you}> (você)</span>}
                  </span>
                  <span
                    className={`${styles.badge} ${user.role === "ADMINISTRATOR" ? styles.badgeAdmin : styles.badgeClient}`}
                  >
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                  <span className={styles.rowEmail}>{user.email}</span>
                  {user.status !== "ACTIVE" && <span className={styles.rowStatus}>{statusLabel(user.status)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {list.page.totalPages > 1 && (
        <nav className={admin.pagination} aria-label="Páginas">
          {page > 0 ? <Link href={pageHref(page - 1)}>← Anteriores</Link> : <span />}
          <span>
            Página {page + 1} de {list.page.totalPages}
          </span>
          {page + 1 < list.page.totalPages ? <Link href={pageHref(page + 1)}>Próximas →</Link> : <span />}
        </nav>
      )}
    </section>
  );
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
