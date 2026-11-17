import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, PawIcon } from "@/components/icons";
import styles from "../entrar/entrar.module.css";
import { RegistrationForm } from "./RegistrationForm";

export const metadata: Metadata = { title: "Criar conta" };

/**
 * Registration with e-mail and password (spec 009). Public; a visitor who is already signed in is
 * sent to /painel by the proxy. The new account must confirm its e-mail before it can sign in.
 */
export default function CadastroPage() {
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
          <h1>Crie a sua conta.</h1>
          <p>Cadastre-se com e-mail e senha para agendar e acompanhar o seu cão.</p>
        </div>
        <span className={styles.sidePlace}>Vicente Pires · Brasília</span>
      </aside>

      <main className={styles.main}>
        <div className={styles.panel}>
          <div className={styles.heading}>
            <h2>Criar conta</h2>
            <p>Preencha os seus dados. Depois, confirme o seu e-mail pelo link que vamos enviar.</p>
          </div>
          <RegistrationForm />
          <p className={styles.help}>
            Já tem conta? <Link href="/entrar">Entrar</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
