from __future__ import annotations

import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Field, Session, SQLModel, col, create_engine, select

# SQLite por defecto; cambiar a Postgres es solo esta URL (DATABASE_URL).
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./server/arcade.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


class Score(SQLModel, table=True):
    """Mejor puntuación por (juego, dispositivo): una fila por jugador y juego."""

    id: int | None = Field(default=None, primary_key=True)
    game_id: str = Field(index=True)
    device_id: str = Field(index=True)
    name: str
    score: int = Field(index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ScoreIn(BaseModel):
    gameId: str
    deviceId: str
    name: str
    score: int


class ScoreOut(BaseModel):
    best: int
    rank: int
    total: int


class Entry(BaseModel):
    name: str
    score: int
    isYou: bool


class LeaderboardOut(BaseModel):
    entries: list[Entry]
    you: Entry | None
    yourRank: int | None
    total: int


@asynccontextmanager
async def lifespan(_: FastAPI):
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(title="Arcade API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _count(session: Session, game_id: str, *, above: int | None = None) -> int:
    stmt = select(func.count()).select_from(Score).where(Score.game_id == game_id)
    if above is not None:
        stmt = stmt.where(Score.score > above)
    return session.exec(stmt).one()


@app.get("/api/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/scores", response_model=ScoreOut)
def submit_score(payload: ScoreIn) -> ScoreOut:
    name = payload.name.strip()[:16] or "Jugador"
    with Session(engine) as session:
        existing = session.exec(
            select(Score).where(
                Score.game_id == payload.gameId, Score.device_id == payload.deviceId
            )
        ).first()

        if existing is None:
            existing = Score(
                game_id=payload.gameId,
                device_id=payload.deviceId,
                name=name,
                score=payload.score,
            )
            session.add(existing)
            session.commit()
            session.refresh(existing)
        elif payload.score > existing.score:
            existing.score = payload.score
            existing.name = name
            existing.updated_at = datetime.now(timezone.utc)
            session.add(existing)
            session.commit()
            session.refresh(existing)

        best = existing.score
        rank = _count(session, payload.gameId, above=best) + 1
        total = _count(session, payload.gameId)
        return ScoreOut(best=best, rank=rank, total=total)


@app.get("/api/leaderboard/{game_id}", response_model=LeaderboardOut)
def leaderboard(game_id: str, deviceId: str | None = None, limit: int = 20) -> LeaderboardOut:
    limit = max(1, min(limit, 100))
    with Session(engine) as session:
        rows = session.exec(
            select(Score)
            .where(Score.game_id == game_id)
            .order_by(col(Score.score).desc(), col(Score.updated_at))
            .limit(limit)
        ).all()
        entries = [
            Entry(name=r.name, score=r.score, isYou=(deviceId is not None and r.device_id == deviceId))
            for r in rows
        ]

        you: Entry | None = None
        your_rank: int | None = None
        if deviceId:
            mine = session.exec(
                select(Score).where(Score.game_id == game_id, Score.device_id == deviceId)
            ).first()
            if mine:
                your_rank = _count(session, game_id, above=mine.score) + 1
                you = Entry(name=mine.name, score=mine.score, isYou=True)

        total = _count(session, game_id)
        return LeaderboardOut(entries=entries, you=you, yourRank=your_rank, total=total)
