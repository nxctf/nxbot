# Reforge Dashboard

A fully functional, scalable dashboard starter for SaaS and business apps. Built with React, Ant Design, Tailwind CSS, and Redux.

## Features

- Customizable UI with Tailwind CSS and Ant Design
- Single-page app routing with React Router
- Mock API integration via [ReqRes](https://reqres.in)
- Admin layout and data tables with `@ant-design/pro-components`
- Code splitting and lazy loading with `@loadable/component`
- State management with `react-redux` and `@reduxjs/toolkit`
- Persistent auth state with `redux-persist`
- Route loading progress bar with `nprogress`
- ESLint 9 (flat config) and Prettier 3
- Progressive Web App support with one-click install from the admin menu
- Axios interceptors for API auth and ReqRes API keys

## Login Credentials

Use these demo credentials to sign in:

- **Email:** `eve.holt@reqres.in`
- **Password:** `password`

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

1. Clone the repository and open the dashboard app:

   ```shell
   git clone https://github.com/iBz-04/Dashboard-starter.git
   cd Dashboard-starter/dashboard
   ```

2. Install dependencies:

   ```shell
   pnpm install
   ```

3. Create your environment file:

   ReqRes requires a free API key for all `/api/*` requests.

   - Get a key from [app.reqres.in/api-keys](https://app.reqres.in/api-keys)
   - Copy `.env.example` to `.env`
   - Add your key to `VITE_REQRES_API_KEY`

   ```shell
   cp .env.example .env
   ```

   Example `.env`:

   ```env
   VITE_REQRES_API_KEY=your_reqres_api_key_here
   VITE_DEMO_MODE=true
   ```

   `VITE_DEMO_MODE=true` pre-fills the login form with demo credentials.

4. Start the dev server:

   ```shell
   pnpm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173)

## Deploy to Vercel

The app must be deployed from the `dashboard` folder, and environment variables must be set in Vercel before the build runs.

1. Import the repo in [Vercel](https://vercel.com)
2. Set **Root Directory** to `dashboard`
3. Use these settings:
   - **Install Command:** `pnpm install`
   - **Build Command:** `pnpm run build`
   - **Output Directory:** `dist`
4. Add environment variables in **Project Settings → Environment Variables**:
   - `VITE_REQRES_API_KEY` — your ReqRes API key from [app.reqres.in/api-keys](https://app.reqres.in/api-keys)
   - `VITE_DEMO_MODE` — optional, set to `true` to pre-fill login credentials
5. **Redeploy** after adding or changing environment variables

Important: Vite reads `VITE_*` variables at build time. If login works locally but fails on Vercel, the API key was likely missing during the Vercel build. Add the variable, then trigger a new deployment.

## Scripts

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `pnpm run dev`          | Start the Vite dev server            |
| `pnpm run build`        | Type-check and build for production  |
| `pnpm run preview`      | Preview the production build locally |
| `pnpm run lint`         | Run ESLint                           |
| `pnpm run lint:fix`     | Run ESLint with auto-fix             |
| `pnpm run prettier`     | Check formatting                     |
| `pnpm run prettier:fix` | Format all supported files           |

## Configuration

App settings such as name, theme, meta tags, and PWA behavior are controlled from `config.ts` at the project root.

```ts
const CONFIG = {
  appName: 'Reforge',
  helpLink: 'https://github.com/iBz-04/Dashboard-starter',
  enablePWA: true,
  theme: {
    accentColor: '#838cf9',
    sidebarLayout: 'mix',
    showBreadcrumb: true,
  },
  metaTags: {
    title: 'Reforge',
    description: 'A dashboard UI solution for Saas and web apps.',
    imageURL: 'logo.svg',
  },
};
```

Set `enablePWA` to `false` to disable Progressive Web App support.

## Progressive Web App

When PWA is enabled:

- The app can be installed from the browser install prompt
- Users can also click **Admin → Download** in the dashboard header to install the app on their device
- On iOS, the menu shows instructions to use **Share → Add to Home Screen**
- On desktop Chrome or Edge, use **Admin → Download** or the install icon in the address bar

## Project Structure

```text
dashboard/
├── config.ts              # App configuration
├── public/                # Static assets
├── src/
│   ├── components/        # UI components
│   ├── routes/            # Route definitions
│   ├── store/             # Redux store and slices
│   └── utils/             # Shared helpers and HTTP client
├── .env.example           # Environment variable template
└── vite.config.ts         # Vite and PWA configuration
```

## Feedback

For questions or feedback, contact [ibz.04dev@gmail.com](mailto:ibz.04dev@gmail.com).

## Author

- [@iBz-04](https://github.com/iBz-04)

## License

[MIT](../LICENSE)
