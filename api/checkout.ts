/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Função serverless (Vercel) — cria uma sessão de Checkout do Stripe para
 * assinatura de um plano (Pro/Team) e devolve a URL de pagamento.
 *
 * Requer as variáveis de ambiente (configuradas na Vercel):
 *   STRIPE_SECRET_KEY      — chave secreta do Stripe (sk_...)
 *   STRIPE_PRICE_PRO       — Price ID do plano Pro (price_...)
 *   STRIPE_PRICE_TEAM      — Price ID do plano Team (price_...)
 *
 * Este arquivo NÃO é incluído no bundle do app (Vite) nem no type-check
 * (excluído no tsconfig): roda apenas no servidor da Vercel, onde a chave
 * secreta fica protegida.
 */

import Stripe from "stripe";

const PRICE_IDS: Record<string, string | undefined> = {
  prata: process.env.STRIPE_PRICE_PRATA,
  ouro: process.env.STRIPE_PRICE_OURO,
  diamante: process.env.STRIPE_PRICE_DIAMANTE,
  esmeralda: process.env.STRIPE_PRICE_ESMERALDA,
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return res.status(501).json({ error: "Cobrança ainda não configurada (STRIPE_SECRET_KEY ausente)." });
  }

  const { plan, userId, email } = (req.body || {}) as { plan?: string; userId?: string; email?: string };
  const price = plan ? PRICE_IDS[plan] : undefined;
  if (!plan || !price) {
    return res.status(400).json({ error: "Plano inválido ou Price ID não configurado." });
  }
  if (!userId) {
    return res.status(400).json({ error: "Usuário não informado." });
  }

  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });
  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: userId,
      customer_email: email || undefined,
      metadata: { userId, plan },
      subscription_data: { metadata: { userId, plan } },
      allow_promotion_codes: true,
      success_url: `${origin}/?billing=success`,
      cancel_url: `${origin}/?billing=cancel`,
    });
    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("[checkout] erro ao criar sessão:", err?.message || err);
    return res.status(500).json({ error: "Falha ao iniciar o checkout." });
  }
}
