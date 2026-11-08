import Link from "next/link";
import {
  ArrowRightIcon,
  CapIcon,
  ChatIcon,
  HomeIcon,
  PawIcon,
  ScissorsIcon,
} from "@/components/icons";
import styles from "./landing.module.css";

const WHATSAPP = "https://wa.me/5561998817120";

const services = [
  {
    title: "Hotel",
    text: "Hospedagem com rotina estruturada: alimentação nos horários de casa, passeios, brincadeiras e descanso.",
    meta: "Por diária",
    Icon: HomeIcon,
  },
  {
    title: "Banho & Tosa",
    text: "Banho, tosa e cuidados higiênicos com produtos adequados à pele e à pelagem de cada cão.",
    meta: "Cerca de 1h30",
    Icon: ScissorsIcon,
  },
  {
    title: "Adestramento",
    text: "Aulas com o tutor presente, para que o que o cão aprende aqui continue funcionando em casa.",
    meta: "Aulas de 50 min",
    Icon: CapIcon,
  },
];

const steps = [
  { title: "Crie sua conta", text: "Entre com a sua conta Google e cadastre o seu cão." },
  { title: "Escolha serviço e horário", text: "Hotel, banho ou adestramento, no dia que for melhor para você." },
  { title: "Receba a confirmação", text: "Nossa equipe revisa o pedido e confirma pelo app." },
  { title: "Acompanhe e pague", text: "Veja o dia a dia do seu cão, converse com a equipe e pague online." },
];

// An illustration of the daily log in the app, not real data.
const dayExample = [
  { time: "07:30", text: "Chegou animado e tomou café da manhã" },
  { time: "09:30", text: "Passeio e brincadeiras no pátio" },
  { time: "13:00", text: "Soneca depois do almoço" },
  { time: "20:00", text: "Remédio da alergia tomado" },
];

/** The public home page. Fully static: it is prerendered at build time and served instantly. */
export default function LandingPage() {
  return (
    <>
      <header className={styles.siteHeader}>
        <nav aria-label="Principal" className={`container ${styles.nav}`}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoMark}>
              <PawIcon />
            </span>
            <span className={styles.logoText}>
              Entre Patas
              <br />e Turnos
            </span>
          </Link>
          <div className={styles.navLinks}>
            <a href="#servicos">Serviços</a>
            <a href="#como-funciona">Como funciona</a>
            <a href="#contato">Contato</a>
            <Link href="/entrar" className={styles.navCta}>
              Entrar
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={`container ${styles.heroInner}`}>
            <div className={styles.heroCopy}>
              <span className={styles.heroEyebrow}>Hotel · Banho &amp; Tosa · Adestramento</span>
              <h1 className={styles.heroTitle}>Seu cão bem cuidado em todos os turnos.</h1>
              <p className={styles.heroText}>
                Hospedagem com rotina estruturada, banho e tosa e adestramento em Vicente Pires,
                Brasília. Agende pelo app, acompanhe o dia a dia do seu cão e fale com a nossa
                equipe quando quiser.
              </p>
              <div className={styles.heroActions}>
                <Link href="/entrar" className={styles.ctaPrimary}>
                  Agendar agora <ArrowRightIcon size={18} />
                </Link>
                <a href={WHATSAPP} className={styles.ctaOutline}>
                  <ChatIcon size={18} /> Falar no WhatsApp
                </a>
              </div>
            </div>

            <figure className={styles.dayCard} aria-label="Exemplo do acompanhamento diário no app">
              <div className={styles.dayHead}>
                <span className={styles.dayAvatar} aria-hidden="true">
                  T
                </span>
                <span className={styles.dayWho}>
                  <strong>O dia do Thor</strong>
                  <span>Hospedagem · Hoje</span>
                </span>
                <span className={styles.liveBadge}>Ao vivo</span>
              </div>
              <ol className={styles.dayList}>
                {dayExample.map((item) => (
                  <li key={item.time}>
                    <time>{item.time}</time>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ol>
              <figcaption className={styles.dayNote}>
                <ChatIcon size={18} /> Equipe: “Ele está ótimo, mandamos fotos!”
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="servicos" className={`container ${styles.section}`}>
          <div className={styles.sectionHead}>
            <span className="eyebrow">Serviços</span>
            <h2>Tudo o que o seu cão precisa, num só lugar</h2>
          </div>
          <div className={styles.services}>
            {services.map(({ title, text, meta, Icon }) => (
              <article key={title} className={styles.service}>
                <span className={styles.serviceIcon}>
                  <Icon size={26} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className={styles.serviceMeta}>{meta}</span>
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className={`container ${styles.section}`}>
          <div className={styles.sectionHead}>
            <span className="eyebrow">Como funciona</span>
            <h2>Do agendamento ao reencontro, tudo pelo app</h2>
          </div>
          <ol className={styles.steps}>
            {steps.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <strong>{step.title}</strong>
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
          <div className={styles.banner}>
            <div>
              <strong>Pronto para a primeira visita?</strong>
              <span>Entre na sua conta para agendar, ou fale com a gente antes.</span>
            </div>
            <Link href="/entrar" className={styles.ctaLight}>
              Entrar e agendar <ArrowRightIcon size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer id="contato" className={styles.footer}>
        <div className={`container ${styles.footerInner}`}>
          <div>
            <strong>Entre Patas e Turnos</strong>
            <span>Vicente Pires · Brasília</span>
          </div>
          <div className={styles.footerLinks}>
            <a href={WHATSAPP}>WhatsApp: (61) 99881-7120</a>
            <Link href="/entrar">Área do cliente</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
