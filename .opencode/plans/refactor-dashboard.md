# Refactor Prompt: NXBot Web Dashboard

## Goal

Refactor total `web-dashboard/` dari monolitik (file 1000+ baris, inline styles, gak pake Tailwind) jadi **modular, reusable, full Tailwind, 3-tab layout** dengan page shell pattern kayak `__ref/nxctf` (PageWrapper + LayoutContainer).

---

## 1. Setup Tailwind CSS + Dark Mode

- Install `tailwindcss`, `postcss`, `autoprefixer` via `npx @tailwindcss/cli init`
- Set `darkMode: "class"` di tailwind config
- Custom colors dari palet existing:
  - `primary: #38bdf8`, `primary-hover: #0ea5e9`
  - `accent-red: #f43f5e`, `accent-green: #10b981`, `accent-yellow: #f59e0b`, `accent-purple: #a855f7`
  - `bg-dark: #07090e`, `bg-panel`, `bg-card`
  - `border-color`, `border-hover`, `muted: #94a3b8`
- Buat `src/lib/styles/surfaces.ts` + `page-background.ts` + `index.ts` (style constants reusable kayak `SURFACE_GLASS_CARD_CLASS`, `PAGE_BG_BASE_CLASS`)
- Pindahin semua inline `style={}` ke Tailwind classes. **Zero inline styles** setelah refactor.
- Font Outfit via `next/font/google`, JetBrains Mono untuk code/monospace

---

## 2. Layout Shell Components (`src/_layouts/`)

```
src/_layouts/
  index.ts                    # barrel export
  PageShell.tsx               # min-h-screen flex flex-col bg-[var(--bg-dark)]
  LayoutContainer.tsx         # max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
  components/
    index.ts
    PageTitle.tsx             # animated h1 + icon (framer-motion or CSS)
    GlassPanel.tsx            # card dengan glass effect (bg-panel + backdrop-blur + border)
    LoadingSpinner.tsx        # centered spinner
    StatusBadge.tsx           # badge variants: success/danger/warning
```

Update `src/app/dashboard/layout.tsx` — wrap dengan PageShell.

---

## 3. Reusable UI Components (`src/components/`)

| Component | Notes |
|---|---|
| `Button.tsx` | variants: primary/secondary/danger/ghost, sizes: sm/md/lg, loading state (spinner + disabled) |
| `GlassInput.tsx` | input field glass styling |
| `GlassSelect.tsx` | select dengan custom chevron arrow |
| `Toggle.tsx` | refactor existing ke Tailwind (switch style) |
| `DataTable.tsx` | generic table with columns config, loading skeleton, empty state, row click |
| `ConfirmDialog.tsx` | modal konfirmasi hapus (overlay + card) |
| `FormField.tsx` | label + input + error message wrapper |
| `NotificationBanner.tsx` | success/error/warning banner, dismissable, icon + message |
| `ChannelSelect.tsx` | dropdown (if bot connected) / manual input fallback + optional test/send button |
| `RoleChip.tsx` | single role chip dengan warna, bisa toggle selected state |

---

## 4. File-File Besar yang Dipecah

### 4a. `src/app/dashboard/servers/[id]/` (1072 lines → modular)

```
src/app/dashboard/servers/[id]/
  page.tsx                       # ~20 baris: async page, render <Suspense><ServerDetailPage /></Suspense>
  _types.ts                      # GuildConfig, EventItem, DiscordChannel, DiscordRole interfaces
  _hooks/
    useGuildConfig.ts            # fetch server detail, events, channels, roles
    useGuildMutations.ts         # handleSave, handleTestConnection, handleDeployPanel
                                 # handleTestFirstBlood, handleTestAnnouncement, handleDeployScoreboard
  _components/
    ServerDetailPage.tsx         # main orchestrator: loading state, activeTab state, form onSubmit
    StickyHeader.tsx             # back btn (ArrowLeft) + title + guild ID badge + active/inactive badge + Save btn
    TabBar.tsx                   # 3 tab buttons (General | NXCTF Integration | Tickets)
    NotificationBar.tsx          # global error/success messages
    
    ## --- Tab 1: General ---
    GeneralTab.tsx               # Guild name input + Server active toggle
    
    ## --- Tab 2: NXCTF Integration ---
    IntegrationTab.tsx           # Master toggle "Enable NXCTF Integration"
                                 # Kalo OFF → semua field readonly/disabled/greyed out
                                 # Kalo ON → semua field editable
    ConnectionSelector.tsx       # Dropdown pilih Supabase connection (from /api/databases)
    ConnectionInfoCard.tsx       # Display supabase_url (masked), anon key (masked), bypass email
    ConnectionTestButton.tsx     # Test button + loading spinner + success/error text
    RealtimeToggle.tsx           # Enable/disable realtime sync
    EventSelector.tsx            # Dropdown events from external Supabase OR manual UUID input
    ChannelIntegrationSection.tsx # wrapper per-channel: toggle enable + ChannelSelect + test/deploy btn
                                 # Digunakan 3x: First Blood, Scoreboard, Announcements
    
    ## --- Tab 3: Tickets ---
    TicketsTab.tsx               # Master toggle "Enable Ticket System"
    TicketChannelConfig.tsx      # Ticket Panel channel + Deploy btn + Logs channel + Category
    RoleMultiPicker.tsx          # Advanced:
                                 # - List semua discord roles (dari API)
                                 # - Tiap role: chip dengan warna role, nama
                                 # - Click = toggle selected
                                 # - Selected state: border solid + background transparan
                                 # - Bisa search/filter
                                 # - Support multiple select
                                 # Dipakai 2x: "Roles to Ping" + "Required Roles"
    TicketWelcomeEditor.tsx      # Textarea custom welcome message + preview
    TicketEmbedEditor.tsx        # Custom embed image URL input + preview gambar kalo valid URL
    
    ## --- Shared dalam folder ini ---
    ActionButtons.tsx            # Cancel + Save buttons di bottom form
```

### 4b. `src/app/dashboard/tickets/` (610 lines)

```
src/app/dashboard/tickets/
  page.tsx
  _types.ts
  _hooks/
    useTickets.ts
  _components/
    TicketFilters.tsx           # status filter + guild filter
    TicketTable.tsx             # DataTable-based ticket list
    TicketTranscriptDrawer.tsx  # slide-in drawer
    TicketMessageList.tsx       # message thread rendering
```

### 4c. `src/app/dashboard/databases/` (482 lines)

```
src/app/dashboard/databases/
  page.tsx
  _types.ts
  _hooks/
    useConnections.ts
    useTurnstile.ts
  _components/
    ConnectionList.tsx
    ConnectionForm.tsx
    ConnectionTestButton.tsx
```

### 4d. `src/app/dashboard/servers/` (332 lines — list page)

```
src/app/dashboard/servers/
  page.tsx
  _types.ts
  _hooks/
    useServers.ts
  _components/
    ServerList.tsx
    ServerCard.tsx
    AddServerForm.tsx
```

### 4e. `src/app/dashboard/settings/` (296 lines)

```
src/app/dashboard/settings/
  page.tsx
  _components/
    PasswordForm.tsx
    DatabaseTools.tsx
    LogsConsole.tsx
```

### 4f. `src/app/dashboard/page.tsx` (199 lines)

```
src/app/dashboard/
  page.tsx
  _components/
    StatCards.tsx
    RecentLogsTable.tsx
```

### 4g. `src/app/setup/` + `src/app/login/`

Convert all inline styles to Tailwind, extract shared AuthForm component.

---

## 5. Tab 2 — Master Toggle Integration Flow

```
┌─────────────────────────────────────┐
│ [Enable NXCTF Integration]  ● ── ON │  ← master toggle
├─────────────────────────────────────┤
│                                     │
│  ┌─ Connection Selector ──────────┐ │  ← Kalo ON: editable
│  │ [Supabase Production]        ▼ │ │      OFF: disabled + grey
│  └────────────────────────────────┘ │
│                                     │
│  ┌─ Connection Info ─────────────┐  │
│  │ URL: https://xxx.supabase.co  │  │
│  │ Key: •••••••••••••            │  │
│  │ Bypass: admin@example.com     │  │
│  └────────────────────────────────┘  │
│                                     │
│  [Test Connection]  ✓ Connected     │
│                                     │
│  ─── Realtime Sync ───              │
│  [x] Enable Supabase Realtime       │
│                                     │
│  Active Event: [550e8400-e29b... ▼] │
│                                     │
│  ─── Discord Channels ───           │
│                                     │
│  [x] First Blood Alerts             │
│      Channel: [#first-blood     ▼]  │
│      [Test Alert]                   │
│                                     │
│  [x] Live Scoreboard                │
│      Channel: [#scoreboard      ▼]  │
│      [Deploy / Update]              │
│                                     │
│  CTF Announcements                  │
│      Channel: [#announcements   ▼]  │
│      [Test Announcement]            │
│                                     │
└─────────────────────────────────────┘
```

---

## 6. File Size Targets

| File | Before | After |
|---|---|---|
| `servers/[id]/page.tsx` | 1072 | ~20 (orchestrator) |
| `servers/[id]/_components/ServerDetailPage.tsx` | — | ~80 |
| `servers/[id]/_components/GeneralTab.tsx` | — | ~40 |
| `servers/[id]/_components/IntegrationTab.tsx` | — | ~120 |
| `servers/[id]/_components/TicketsTab.tsx` | — | ~150 |
| `servers/[id]/_components/RoleMultiPicker.tsx` | — | ~120 |
| `servers/[id]/_components/ChannelIntegrationSection.tsx` | — | ~80 |
| `servers/[id]/_components/StickyHeader.tsx` | — | ~60 |
| `servers/[id]/_hooks/useGuildConfig.ts` | — | ~100 |
| `servers/[id]/_hooks/useGuildMutations.ts` | — | ~120 |
| `tickets/page.tsx` | 610 | ~30 (orchestrator) |
| `databases/page.tsx` | 482 | ~30 (orchestrator) |
| `servers/page.tsx` | 332 | ~30 (orchestrator) |
| `settings/page.tsx` | 296 | ~30 (orchestrator) |
| `dashboard/page.tsx` | 199 | ~20 (orchestrator) |

---

## 7. Component Reusability Matrix

| Component | Used In |
|---|---|
| `Button` | Every page |
| `Toggle` | GeneralTab, IntegrationTab, TicketsTab, settings |
| `GlassInput` | All forms |
| `GlassSelect` | All selects |
| `FormField` | All forms |
| `NotificationBanner` | All pages |
| `ConfirmDialog` | Servers list, Databases, Tickets |
| `DataTable` | Tickets, Databases, Dashboard (logs) |
| `ChannelSelect` | IntegrationTab (x3), TicketsTab (x3) |
| `RoleMultiPicker` | TicketsTab (x2) |
| `StatusBadge` | Servers list, Server detail, Tickets |
| `LoadingSpinner` | All pages |
| `GlassPanel` | All pages (card wrapper) |

---

## 8. Priority Order Eksekusi

1. Install & config Tailwind (`tailwind.config.js`, `postcss.config.js`)
2. Buat `src/lib/styles/` (surfaces, page-background, index.ts)
3. Buat `src/_layouts/` (PageShell, LayoutContainer, GlassPanel, etc)
4. Buat reusable UI components di `src/components/` (Button, Toggle, GlassInput, etc)
5. Update `src/app/layout.tsx` + `src/app/dashboard/layout.tsx` pake PageShell
6. Refactor `src/app/dashboard/page.tsx` (overview — small)
7. Refactor `src/app/dashboard/servers/page.tsx` (list — medium)
8. Refactor `src/app/dashboard/servers/[id]/` (detail — BIG, 3 tabs)
9. Refactor `src/app/dashboard/tickets/` (large)
10. Refactor `src/app/dashboard/databases/` (large)
11. Refactor `src/app/dashboard/settings/` (medium)
12. Refactor `src/app/setup/` + `src/app/login/` (small)
13. Cleanup: hapus CSS classes dari `globals.css` yang udah migrasi ke Tailwind

---

## 9. Non-Negotiable Rules

- **Zero inline `style={}`** — all Tailwind utility classes
- **Max ~150-200 lines per component file** (kecuali hooks)
- Setiap page folder: `page.tsx` + `_components/` + `_hooks/` + `_types.ts`
- Barrel `index.ts` export di setiap folder komponen
- All data fetching & mutation logic di custom hooks (`_hooks/`)
- Components cuma render JSX + bind events — **no logic**
- Dark mode ready via `dark:` prefix (walau full dark sekarang)
- **JANGAN** ubah logic backend (API routes, database queries, auth)
- Pattern: `useGuildConfig.ts` return `{ data, loading, error, refetch }` — konsisten
- Pattern: `useGuildMutations.ts` return `{ save, testConnection, isSaving, isTesting }`
