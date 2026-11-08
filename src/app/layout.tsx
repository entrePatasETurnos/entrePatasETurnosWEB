import type { Metadata } from "next";
// Fonts are bundled from npm (@fontsource) instead of fetched from Google at build time,
// so builds work offline and visitors' browsers never call Google just to load a font.
import "@fontsource/lato/400.css";
import "@fontsource/lato/700.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import "@fontsource/montserrat/900.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Entre Patas e Turnos — Hotel, banho e adestramento",
    template: "%s · Entre Patas e Turnos",
  },
  description:
    "Hospedagem com rotina estruturada, banho e tosa e adestramento em Vicente Pires, Brasília.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
