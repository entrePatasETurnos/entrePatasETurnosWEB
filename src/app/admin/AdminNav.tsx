import Link from "next/link";
import styles from "./admin.module.css";

const LINKS = [
  { key: "inicio", href: "/admin", label: "Pendências" },
  { key: "hospedagens", href: "/admin/hospedagens", label: "Hospedagens" },
] as const;

/** The administrator's sections. `current` marks the page being shown (for screen readers too). */
export function AdminNav({ current }: { current: (typeof LINKS)[number]["key"] }) {
  return (
    <nav className={styles.adminNav} aria-label="Seções do painel">
      <div className={`container ${styles.adminNavInner}`}>
        {LINKS.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className={`${styles.adminNavLink} ${link.key === current ? styles.adminNavActive : ""}`}
            aria-current={link.key === current ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
