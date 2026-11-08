import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, PawIcon } from "@/components/icons";
import { GoogleSignIn } from "./GoogleSignIn";
import styles from "./entrar.module.css";

export const metadata: Metadata = { title: "Entrar" };

/**
 * One login for everyone. After signing in, /painel asks the API for the person's role and sends
 * administrators to /admin and tutors to /app.
 */
export default function EntrarPage() {
  return (
    <div className={styles.page}>
      <aside className={styles.side}>
        <Link href="/" className={styles.back}>
          <ArrowLeftIcon size={16} /> Voltar ao site
        </Link>
        <div className={styles.sideCopy}>
          <span className={styles.sideMark}>
            <PawIcon size={34} />
          </span>
          <span className={styles.sideBrand}>Entre Patas e Turnos</span>
          <h1>Que bom ver você de novo.</h1>
          <p>
            Tutores entram para agendar e acompanhar o seu cão. A equipe entra para aprovar reservas
            e cuidar da agenda. É o mesmo acesso, e cada um vê a sua área.
          </p>
        </div>
        <span className={styles.sidePlace}>Vicente Pires · Brasília</span>
      </aside>

      <main className={styles.main}>
        <div className={styles.panel}>
          <div className={styles.heading}>
            <h2>Entrar</h2>
            <p>Use a sua conta Google. Se for a primeira vez, a sua conta é criada agora.</p>
          </div>
          <GoogleSignIn />
          <p className={styles.help}>
            Problemas para entrar?{" "}
            <a href="https://wa.me/5561998817120">Fale com a gente no WhatsApp</a>
          </p>
        </div>
      </main>
    </div>
  );
}
