import { plural } from "@/lib/format";

/**
 * The confirmation shown after an action. Each Server Action redirects back to the page it came from
 * with `aviso=...` (see actions.ts), and both admin pages turn it into a message here.
 */
export function noticeFrom(params: Record<string, string | string[] | undefined>): string | null {
  switch (params.aviso) {
    case "aprovada":
      return "Pedido aprovado. O tutor já vê a confirmação na área dele.";
    case "recusada":
      return "Pedido recusado. O tutor vê o motivo na área dele.";
    case "concluida":
      return "Pedido marcado como concluído.";
    case "lote": {
      const ok = Number(params.ok) || 0;
      const total = Number(params.total) || 0;
      return ok === total
        ? `${plural(ok, "pedido aprovado", "pedidos aprovados")}.`
        : `${ok} de ${total} pedidos aprovados. Os outros continuam pendentes: veja o motivo em cada um.`;
    }
    default:
      return null;
  }
}
