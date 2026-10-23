# retro-schijf 👶

A retro-styled Next.js app for the arrival of baby Schijff (due 28 Jan 2027). Features a live countdown, pari-mutuel betting on birth details, mini-games, wishes, cravings, voting, and a scoreboard.

## Features

- **Countdown** to the due date
- **Betting (Gokken)** — pari-mutuel pool betting on birth date, weight, length, name, hair/eye color
- **Mini-games** — Deadlift, Evolutie (Pokémon rhythm race), Shooter
- **Wishes & cravings** — guestbook-style messages and craving counter
- **Voting** — meals & Pokémon
- **Scoreboard** — mini-game high scores
- **Admin panel** — resolve bets, manage config

## Tech stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS 4 · next-themes
- File-based JSON store (`data/db.json`)
- Docker + Traefik (production)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Lint |

## Tests

```bash
npx tsx --test tests/odds.test.ts
```

## Configuration

Runtime config lives in `data/db.json`. Key fields:

- `dueDate` — ISO date of expected birth
- `houseBankroll` — starting bankroll (legacy, unused in pooled mode)
- `mealOptions` / `pokemonOptions` — voting choices
- `votingEnabled`, `snackCount`, `nameCandidates`

## Deployment

Production runs via Docker Compose behind Traefik. Set the public hostname in `compose.yml` (`traefik.http.routers.*.rule=Host(...)`).

```bash
docker compose build && docker compose up -d
```

Data persists in `./data` (mounted volume) — back it up regularly.

### Environment

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `production` | Runtime mode |
| `PORT` | `3000` | Listen port |
| `HOSTNAME` | `0.0.0.0` | Bind address |

## Project structure

```
src/
  app/          # Next.js routes (pages + API)
  components/   # Retro UI components
  lib/          # odds, store, data client
tests/          # odds unit tests
data/           # runtime JSON store (gitignored)
```

## License

Private — © Schijff family.