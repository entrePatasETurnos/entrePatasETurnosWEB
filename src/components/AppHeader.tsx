import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions";
import { LogOutIcon, PawIcon } from "./icons";
import styles from "./AppHeader.module.css";

/** Header of the signed-in areas. The greeting reads the session, so it streams in on its own. */
export function AppHeader({ area }: { area: string }) {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <span className={styles.mark}>
            <PawIcon />
          </span>
          <span className={styles.brandText}>
            <span className={styles.name}>Entre Patas e Turnos</span>
            <span className={styles.area}>{area}</span>
          </span>
        </div>
        <div className={styles.user}>
          <Suspense fallback={null}>
            <Greeting />
          </Suspense>
          <form action={signOut}>
            <button type="submit" className={styles.logout}>
              <LogOutIcon size={16} />
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

async function Greeting() {
  const user = await getCurrentUser();
  const first = user?.name.split(" ")[0];
  return first ? <span className={styles.hello}>Olá, {first}</span> : null;
}
