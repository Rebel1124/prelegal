import secrets
import sqlite3
from dataclasses import dataclass

import bcrypt
from fastapi import Depends, Header, HTTPException
from pydantic import Field

from app.db import get_db
from app.schemas import CamelModel


class SignupRequest(CamelModel):
    email: str = Field(min_length=1)
    password: str = Field(min_length=8)


class LoginRequest(CamelModel):
    email: str
    password: str


class AuthResponse(CamelModel):
    token: str
    email: str


@dataclass
class CurrentUser:
    id: int
    email: str


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_session(db: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    db.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    db.commit()
    return token


def run_signup(db: sqlite3.Connection, request: SignupRequest) -> AuthResponse:
    password_hash = hash_password(request.password)
    try:
        cursor = db.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (request.email, password_hash),
        )
        db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Email is already registered")

    token = create_session(db, cursor.lastrowid)
    return AuthResponse(token=token, email=request.email)


def run_login(db: sqlite3.Connection, request: LoginRequest) -> AuthResponse:
    row = db.execute(
        "SELECT id, password_hash FROM users WHERE email = ?", (request.email,)
    ).fetchone()
    if row is None or not verify_password(request.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_session(db, row["id"])
    return AuthResponse(token=token, email=request.email)


def get_current_user(
    authorization: str | None = Header(default=None),
    db: sqlite3.Connection = Depends(get_db),
) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    row = db.execute(
        "SELECT users.id AS id, users.email AS email FROM sessions "
        "JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?",
        (token,),
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return CurrentUser(id=row["id"], email=row["email"])
