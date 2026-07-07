/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Controle de acesso ao painel de administração.
 *
 * Super-admin(s) por e-mail — apenas estes enxergam e usam o painel de admin.
 * Outros administradores podem ser promovidos dentro do próprio painel
 * (marcados em `users/{uid}.isAdmin`), mas o super-admin abaixo é fixo.
 *
 * IMPORTANTE: em um app 100% client-side isto é uma barreira de UI. Para
 * controle real (bloquear usuários, alterar planos, faturamento), as ações
 * sensíveis precisam ser validadas por security rules / função no servidor.
 */

export const SUPER_ADMIN_EMAILS = ["pedromarcelinoh7@gmail.com"];

export function isSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}
