# AlphaBot Terminal (trade-hook-frontend)

React frontend for the trade-hook Django API — strategy (hookset) management, TradingView webhook URLs, and live execution status.

## Setup

```bash
npm install
npm run dev
```

Vite proxies `/api` → `http://127.0.0.1:8000`. Run the Django backend separately.

## Routes

| Path | Description |
|------|-------------|
| `/login` | Sign in / register |
| `/` | Dashboard — strategy execution + webhook stream |
| `/strategies` | Strategy management grid |
| `/strategies/new` | Strategy builder |
| `/strategies/:id` | Detail, copy trigger URLs, manual trigger |
| `/settings` | Profile + password |

## API mapping

- Strategies → `HookSet`
- Webhooks → `Hook` (`POST .../hooks/{id}/trigger/`)
- Trades → `Trade` (`LONG` / `SHORT`)
