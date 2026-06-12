# Arcade API (Fase 3)

Backend de leaderboards: **FastAPI + SQLModel + SQLite**.

## Correr en local

```bash
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cd ..
uvicorn server.main:app --reload --port 8000
```

Crea `server/arcade.db` (SQLite) al arrancar. El frontend (Vite) habla con `/api`
vía proxy en desarrollo, así que no hay que tocar CORS ni URLs.

## Endpoints

- `GET  /api/health` → `{ ok: true }`
- `POST /api/scores` → body `{ gameId, deviceId, name, score }`; hace upsert del mejor
  puntaje por (juego, dispositivo) y devuelve `{ best, rank, total }`.
- `GET  /api/leaderboard/{gameId}?deviceId=&limit=20` → top N + tu posición.

## Producción

Cambiar a Postgres es solo la variable `DATABASE_URL`
(ej. `postgresql+psycopg://user:pass@host/db`); el ORM es el mismo.
