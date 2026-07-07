/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Cliente de cobrança — inicia o checkout do Stripe chamando a função
 * serverless `/api/checkout` (que mantém a chave secreta no servidor) e
 * redireciona o navegador para a página de pagamento do Stripe.
 */

export type PaidPlan = "prata" | "ouro" | "diamante" | "esmeralda";

export async function startCheckout(plan: PaidPlan, userId: string, email?: string): Promise<void> {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, userId, email }),
  });

  if (!res.ok) {
    let msg = "Não foi possível iniciar o pagamento.";
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* corpo não-JSON */
    }
    throw new Error(msg);
  }

  const data = await res.json();
  if (data?.url) {
    window.location.href = data.url as string;
  } else {
    throw new Error("Resposta de checkout inválida.");
  }
}

/** Lê o parâmetro ?billing=success|cancel da URL (para feedback pós-retorno). */
export function readBillingReturn(): "success" | "cancel" | null {
  try {
    const v = new URLSearchParams(window.location.search).get("billing");
    return v === "success" || v === "cancel" ? v : null;
  } catch {
    return null;
  }
}

/** Remove o parâmetro ?billing da URL sem recarregar a página. */
export function clearBillingParam(): void {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("billing");
    window.history.replaceState({}, "", url.toString());
  } catch {
    /* noop */
  }
}
