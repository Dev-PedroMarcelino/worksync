# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**worksync** ("Organização de Tarefas") is a client-side collaboration PWA for organizing tasks in groups (with subgroups, task boards, whiteboard, notes, and chat) and personally. The UI is in Brazilian Portuguese (pt-BR) — keep user-facing strings in Portuguese.

Stack: Vite 6 + React 19 + TypeScript, Tailwind CSS v4 (via `@tailwindcss/vite`, no config file), Firebase (Auth + Firestore), `motion` (Framer Motion) for animation, `lucide-react` for icons. There is no backend server — the app talks to Firestore directly from the browser.

## Commands

- `npm run dev` — start Vite dev server on port 3000 (host 0.0.0.0)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build
- `npm run lint` — **type-check only** (`tsc --noEmit`); this is the lint/CI check
- There is **no test suite** and no test runner configured.

The `@` alias maps to the repo root (see `vite.config.ts` / `tsconfig.json` paths).

## Architecture

### One giant context is the whole app

`src/context/AppContext.tsx` (~3400 lines) is the single source of truth. It holds **all** state (current user, groups, members, subgroups, tasks, whiteboard items/boards, notebooks, chat messages, audit logs, friends, requests, notifications, toasts, navigation) and **all** actions (auth, CRUD for every entity, chat, friends). Components under `src/components/` are largely presentational and consume everything via the `useApp()` hook. When adding a feature, the data/logic almost always goes in `AppContext.tsx`; the component just renders it. `src/types.ts` defines every entity interface.

### Dual persistence: Cloud mode vs Demo mode

The app runs in one of two mutually exclusive modes, decided once at startup in `src/db/firebase.ts`:

- **Cloud mode** (`isFirebaseCloud === true`): real Firebase. Active when `firebase-applet-config.json` has a real `apiKey` (not `"MOCK_API_KEY"`). Uses Firestore with real-time `onSnapshot` listeners and Firebase Auth (email/password + Google popup).
- **Demo mode** (`isDemoMode === true`): everything is emulated in `localStorage` with `demo_*` keys, no network. This is the fallback when Firebase config is mock or init fails; `enterDemoMode()` also forces it from the auth screen.

**Critical:** nearly every action and data-loading `useEffect` in `AppContext.tsx` branches `if (isDemoMode) { ...localStorage... } else { ...firestore... }`. Any new persisted feature must implement **both** paths or it will silently break in one mode.

### Firestore data model / path conventions

State is loaded by wiring `onSnapshot` (cloud) or reading `localStorage` (demo) inside `useEffect`s keyed on `currentUser`, `selectedGroup`, `selectedSubgroup`. Paths follow a strict hierarchy:

- Groups: `groups/{groupId}` with subcollections `members`, `subgroups`, `messages`, `auditLogs`, `notifications`
- Group content lives under a subgroup: `groups/{groupId}/subgroups/{subId}/{tasks|whiteboard|notebooks|boards}`
- Personal area (no group): `users/{userId}/personal{Tasks|Whiteboard|Notes|Subgroups|Boards}`, and per personal-subgroup nesting under `users/{userId}/personalSubgroups/{subId}/...`
- Friends: `users/{userId}/{friends|friendRequests}`

**Direct messages are modeled as pseudo-groups.** A DM "group" id is `"dm_" + [userIdA, userIdB].sort().join("_")` — deterministic regardless of who initiates. DM groups are created lazily on first message and are filtered out of the normal groups panel (`id.startsWith("dm_")` / `code === "DM"`). Reuse this exact id derivation anywhere you touch DMs.

### Navigation model

Two independent axes, both in context:
- `activeTab`: `"personal" | "groups"`, then `selectedGroup` → `selectedSubgroup` drill-down.
- `activeModule`: `"tasks" | "whiteboard" | "notes" | "chat" | "audit"` selects which workspace panel renders.

`Sidebar.tsx` drives selection; `Workspace.tsx` (~2000 lines) renders the active module and hosts most modals. `App.tsx` handles the auth gate, responsive sidebar (desktop collapse + mobile drawer), and the toast container.

### Security rules

`firestore.rules` is the deployed ruleset (default-deny with per-collection allow rules); `DRAFT_firestore.rules` is a working draft. When changing Firestore paths or fields, update `firestore.rules` to match, or writes will be rejected in cloud mode. `firebase-blueprint.json` documents the intended entity schemas.

## Conventions & gotchas

- **Colors are Tailwind class strings**, not hex — member/subgroup/note colors are stored as full class strings like `"text-emerald-500 bg-emerald-500/10 border-emerald-500/30"` (see `PRESET_MEMBER_COLORS`). Preserve this format.
- **Images (avatars, group backgrounds) are stored as base64 strings** directly in Firestore/localStorage — there is no file/blob storage.
- HMR is gated by the `DISABLE_HMR` env var (set by AI Studio) — do not remove that logic in `vite.config.ts`.
- PWA: `index.html` registers `public/sw.js`; `public/manifest.json` defines install metadata. `promptInstall()` and `requestNotificationPermission()` in context handle install prompt and native notifications.
- `@google/genai` / `GEMINI_API_KEY` and `express` are present in `package.json` (AI Studio template leftovers) but are **not used** in `src/`. Don't assume a Gemini integration or a server exists.
