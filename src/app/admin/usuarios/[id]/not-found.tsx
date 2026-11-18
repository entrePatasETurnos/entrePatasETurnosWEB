import Link from "next/link";
import admin from "../../admin.module.css";

/** An unknown or malformed id under /admin/usuarios (spec 010). */
export default function UserNotFound() {
  return (
    <section className={admin.panel} aria-labelledby="usuario-nao-encontrado">
      <div className={admin.list}>
        <h1 id="usuario-nao-encontrado" className={admin.empty}>
          Usuário não encontrado.
        </h1>
        <p>
          <Link href="/admin/usuarios">Voltar para a lista de usuários</Link>
        </p>
      </div>
    </section>
  );
}
