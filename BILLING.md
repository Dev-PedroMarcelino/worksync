# Cobrança (Stripe) — guia de configuração

O worksync tem o **esqueleto** de cobrança por assinatura pronto: página de
planos, checkout via Stripe e ativação do plano por webhook. Falta apenas
**configurar as chaves** — este guia mostra como.

> Sem configuração, o app funciona normal: a página de planos abre e, ao tentar
> assinar, mostra um aviso amigável de que a cobrança ainda não está ativa.

## Como funciona

```
PlansModal (cliente)
   └─ startCheckout()  ──POST──▶  /api/checkout  (serverless, chave secreta)
                                      └─ cria a sessão de Checkout do Stripe
                                      └─ redireciona o navegador p/ o Stripe
Stripe  ──webhook──▶  /api/webhook  (serverless)
                          └─ valida a assinatura
                          └─ grava users/{uid}.plan no Firestore (firebase-admin)
```

- `api/checkout.ts` — cria a sessão de Checkout. A chave secreta nunca vai ao cliente.
- `api/webhook.ts` — valida o evento do Stripe e ativa/atualiza o plano do usuário.
- `src/services/billing.ts` — cliente que chama o checkout e trata o retorno.

## 1. No painel do Stripe

1. Crie os **produtos e preços** (recorrentes/mensais) para os planos **Pro** e **Team**.
   Anote os `price_...` de cada um.
2. Em **Developers → Webhooks**, adicione um endpoint:
   - URL: `https://SEU_DOMINIO/api/webhook`
   - Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copie o **Signing secret** (`whsec_...`).

## 2. Firebase (para o webhook gravar o plano)

Gere uma **service account** (Configurações do projeto → Contas de serviço →
Gerar nova chave privada) e copie o JSON inteiro.

> A regra do Firestore deve permitir apenas escrita confiável no campo `plan`.
> Como o webhook usa a service account (admin), ele ignora as security rules;
> ainda assim, recomenda-se restringir a escrita do `plan` pelo cliente.

## 3. Variáveis de ambiente (na Vercel)

Em **Project → Settings → Environment Variables**:

| Variável | Valor |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_live_...` (ou `sk_test_...`) |
| `STRIPE_PRICE_PRO` | `price_...` do plano Pro |
| `STRIPE_PRICE_TEAM` | `price_...` do plano Team |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` do endpoint de webhook |
| `FIREBASE_SERVICE_ACCOUNT` | JSON da service account (string única) |

Redeploy após salvar. Pronto — o botão "Assinar" passa a abrir o Checkout real
e o plano é ativado automaticamente após o pagamento.

## Teste local

Use a [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

E rode o app com `vercel dev` (para as funções em `api/` responderem localmente).
