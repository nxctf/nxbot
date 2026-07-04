# NXBot 🤖

> **Multi-Server Discord CTF Bot Platform with Web-Managed Dashboard & Supabase Integration.**
> Manage multiple CTF discord servers from a single bot instance. Connect directly to read-only NXCTF Supabase databases. Configure channels and features via a premium glassmorphic Web UI.

---

## ✨ Features

### 🌐 Web Dashboard (Next.js 16)
- **First-Time Setup Wizard**: Securely configure admin credentials on first boot.
- **Server Tenant Management**: Add, update, or remove Discord servers (`guilds`) dynamically.
- **Supabase Credentials Validation**: Auto-tests connectivity to the server's Supabase instance.
- **Dynamic Event Picker**: Fetches events directly from the target Supabase instance so you can select which active CTF event to track.
- **Discord Channel Routing**: Configure separate channels for First Blood alerts, Live Scoreboards, Announcements, and Ticket logs.
- **Ticket Viewer**: Browse support tickets opened by participants across all servers.
- **System Console Log**: Live terminal viewer showing bot activity, connection statuses, and errors.

### 🤖 Discord Bot (discord.js v14)
- **🩸 Realtime First Bloods**: Subscribes to Supabase `solves` table insert events. Sends rich embeds to designated first-blood channels, using a local SQLite cache to prevent duplicates.
- **🏆 Live Scoreboard (`/scoreboard`)**: Displays top rankings and points calculated from user solve data.
- **📋 Challenges Listing (`/challenges`)**: Displays challenges grouped by category with custom difficulty indicator badges.
- **🎫 Ticketing System (`/ticket`)**: Creates private, temporary text channels in a specified category for participant help. Tracks assignees and status (`open`, `in_progress`, `closed`) in SQLite.

---

## 🏗️ Monorepo Structure

```text
nxbot/
├── nxbot                 # Bash CLI wrapper (start/stop/status/logs/setup)
├── docker-compose.yml    # Container orchestration
├── db/
│   └── schema.sql        # Local SQLite database structure
├── web-dashboard/        # Next.js 16 management dashboard
└── discord-bot/          # discord.js bot engine
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Docker** and **Docker Compose**
- **sqlite3** CLI (for initialization setup)
- A **Discord Bot Token** (obtain from [Discord Developer Portal](https://discord.com/developers/applications))

### 2. Setup Database & Environment
Run the interactive CLI setup to configure the SQLite database and create `.env` template:
```bash
./nxbot setup
```

Edit the generated `.env` file in the root directory:
```env
DISCORD_BOT_TOKEN=your_bot_token_here
JWT_SECRET=your_glowing_dashboard_session_secret
```

### 3. Spin Up Services
Build and start the dashboard and discord bot in background containers:
```bash
docker compose build --no-cache web-dashboard

./nxbot build
./nxbot start
```

### 4. Admin Initialization
1. Open your browser and navigate to `http://localhost:3000`.
2. The dashboard will detect a fresh installation and prompt the **Setup Wizard**.
3. Create your administrator credentials.
4. Log in to access the panel, register your first Discord Server and map its Supabase credentials.

---

## 💻 CLI Command Reference

The `./nxbot` control script acts as an easy command dispatcher:
- `./nxbot start` : Boot up all services.
- `./nxbot stop` : Shut down and remove containers.
- `./nxbot restart` : Gracefully restarts all services.
- `./nxbot status` : Shows health checks and running ports.
- `./nxbot web` : Starts dashboard ONLY (maintenance/safe mode).
- `./nxbot logs [bot/web]` : Tails logs for a specific service.

---

## 🔒 Security & Multi-Tenancy

- **Read-Only Supabase Anon Access**: Bot uses the client's public anon key to read `solves`, `challenges`, `users`, and `events` tables.
- **Zero Configuration in .env**: All Supabase keys, URLs, and channel IDs are stored in the local SQLite database (`data/nxbot.db`), ensuring no sensitive CTF credentials leaks in environment variables.
- **Isolated SQLite Storage**: Next.js and the Bot share database state via a Docker volume mount. System configuration, logs, ticketing metadata, and first blood caches are fully self-hosted.

---

*Built with ❤️ by the NXCTF Community.*
