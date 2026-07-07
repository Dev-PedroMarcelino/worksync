/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

/**
 * Trata links de convite: ao abrir o app com `?join=CODIGO`, entra no grupo
 * automaticamente (uma vez), avisa o usuário e limpa o parâmetro da URL.
 * Componente headless, montado na área autenticada.
 */
const InviteHandler: React.FC = () => {
  const { currentUser, joinGroup, setActiveTab, setSelectedGroup, setSelectedSubgroup } = useApp();
  const notify = useToast();
  const handled = useRef(false);

  useEffect(() => {
    if (!currentUser || handled.current) return;

    let code: string | null = null;
    try {
      code = new URLSearchParams(window.location.search).get("join");
    } catch {
      code = null;
    }
    if (!code) return;

    handled.current = true;
    const clean = code.trim().toUpperCase();

    // remove o parâmetro para não reprocessar em recarregamentos
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("join");
      window.history.replaceState({}, "", url.toString());
    } catch {
      /* noop */
    }

    (async () => {
      try {
        const group = await joinGroup(clean);
        setActiveTab("groups");
        setSelectedGroup(group);
        setSelectedSubgroup(null);
        notify(`Você entrou no grupo "${group.name}"!`, "success");
      } catch (e: any) {
        notify(e?.message || "Convite inválido ou expirado.", "error");
      }
    })();
  }, [currentUser, joinGroup, setActiveTab, setSelectedGroup, setSelectedSubgroup, notify]);

  return null;
};

export default InviteHandler;
