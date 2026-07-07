/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Função serverless (Vercel) — recebe os webhooks do Stripe, valida a
 * assinatura e ativa/atualiza o plano do usuário no Firestore.
 *
 * Requer as variáveis de ambiente (na Vercel):
 *   STRIPE_SECRET_KEY          — chave secreta do Stripe (sk_...)
 *   STRIPE_WEBHOOK_SECRET      — segredo do endpoint de webhook (whsec_...)
 *   FIREBASE_SERVICE_ACCOUNT   — JSON da service account do Firebase (string)
 *                                usado para escrever users/{uid}.plan com segurança.
 *
 * Configure o endpoint no painel do Stripe apontando para:
 *   https://SEU_DOMINIO/api/webhook
 * escutando os eventos: checkout.session.completed,
 * customer.subscription.updated, customer.subscription.deleted.
 *
 * A escrita do plano só ocorre se FIREBASE_SERVICE_ACCOUNT estiver presente;
 * caso contrário o evento é validado e registrado, mas sem efeito (no-op),
 * para o esqueleto nunca quebrar em ambientes sem credenciais.
 */

import Stripe from "stripe";

export const config = { api: { bodyParser: false } };

function readRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// Inicialização preguiçosa do firebase-admin (só quando há credenciais).
let adminDb: any = null;
async function getAdminDb(): Promise<any | null> {
  if (adminDb) return adminDb;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const admin = await import("firebase-admin");
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
    }
    adminDb = admin.firestore();
    return adminDb;
  } catch (e) {
    console.error("[webhook] falha ao iniciar firebase-admin:", e);
    return null;
  }
}

async function setUserPlan(userId: string, plan: string) {
  const db = await getAdminDb();
  if (!db) {
    console.warn(`[webhook] plano '${plan}' para ${userId} não gravado (FIREBASE_SERVICE_ACCOUNT ausente).`);
    return;
  }
  await db.collection("users").doc(userId).set({ plan }, { merge: true });
  console.log(`[webhook] plano '${plan}' ativado para ${userId}.`);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return res.status(501).json({ error: "Webhook não configurado." });
  }

  const stripe = new Stripe(secret, { apiVersion: "2024-06-20" });
  const sig = req.headers["stripe-signature"];

  let event: Stripe.Event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (err: any) {
    console.error("[webhook] assinatura inválida:", err?.message || err);
    return res.status(400).json({ error: "Assinatura inválida." });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = s.client_reference_id || (s.metadata as any)?.userId;
        const plan = (s.metadata as any)?.plan || "pro";
        if (userId) await setUserPlan(userId, plan);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = (sub.metadata as any)?.userId;
        const plan = (sub.metadata as any)?.plan || "pro";
        if (userId) await setUserPlan(userId, sub.status === "active" || sub.status === "trialing" ? plan : "free");
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = (sub.metadata as any)?.userId;
        if (userId) await setUserPlan(userId, "free");
        break;
      }
      default:
        break;
    }
    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("[webhook] erro ao processar evento:", err?.message || err);
    return res.status(500).json({ error: "Erro ao processar evento." });
  }
}
