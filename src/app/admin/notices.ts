import { plural } from "@/lib/format";

/**
 * The confirmation shown after an action. Each Server Action redirects back to the page it came from
 * with `aviso=...` (see actions.ts), and both admin pages turn it into a message here.
 */
export function noticeFrom(params: Record<string, string | string[] | undefined>): string | null {
  switch (params.aviso) {
    case "aprovada":
      return "Reserva aprovada. O tutor já vê a confirmação na área dele.";
    case "recusada":
      return "Reserva recusada. O tutor vê o motivo na área dele.";
    case "concluida":
      return "Reserva marcada como concluída.";
    case "lote": {
      const ok = Number(params.ok) || 0;
      const total = Number(params.total) || 0;
      return ok === total
        ? `${plural(ok, "reserva aprovada", "reservas aprovadas")}.`
        : `${ok} de ${total} reservas aprovadas. As outras continuam pendentes: veja o motivo em cada uma.`;
    }
    default:
      return null;
  }
}
