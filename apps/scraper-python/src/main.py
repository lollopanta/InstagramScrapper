from __future__ import annotations

import json
import os
from typing import Any, Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

from instagpy import InstaGPy


COOKIE_FILE = os.environ.get("IG_COOKIE_FILE", "/app/apps/api/cookie.json")


class ScrapeRequest(BaseModel):
    sourceType: Literal["USERNAME", "HASHTAG", "LOCATION"]
    sourceValue: str = Field(min_length=1)


class ScrapedLead(BaseModel):
    instagramId: str | None = None
    username: str
    fullName: str | None = None
    bio: str | None = None
    website: str | None = None
    publicEmail: str | None = None
    followerCount: int = 0
    followingCount: int = 0
    source: str | None = None


class ScrapeResponse(BaseModel):
    status: Literal["FOUND", "NOT_FOUND", "LOGIN_REQUIRED", "RATE_LIMITED", "BLOCKED", "UNSUPPORTED", "UNKNOWN"]
    leads: list[ScrapedLead] = Field(default_factory=list)
    error: str | None = None
    raw: dict[str, Any] | None = None


app = FastAPI(title="DataReach InstaGPy Scraper")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/scrape", response_model=ScrapeResponse)
def scrape(payload: ScrapeRequest) -> ScrapeResponse:
    try:
      session_ids = load_session_ids()
    except Exception as error:
      return ScrapeResponse(status="LOGIN_REQUIRED", error=str(error))

    try:
        if payload.sourceType == "USERNAME":
            return scrape_username(payload.sourceValue, session_ids)
        if payload.sourceType == "HASHTAG":
            return scrape_hashtag(payload.sourceValue, session_ids)
        return ScrapeResponse(status="UNSUPPORTED", error="Location scraping is not implemented in the InstaGPy worker yet.")
    except Exception as error:
        return classify_error(error)


def scrape_username(username: str, session_ids: list[str]) -> ScrapeResponse:
    username = username.strip().lstrip("@").lower()
    client = build_client(session_ids)
    info = client.get_user_info(username)
    user = (((info or {}).get("data") or {}).get("user") or {})

    if not user:
        return ScrapeResponse(status="NOT_FOUND", error=f'Instagram username "{username}" was not found.', raw=info)

    lead = ScrapedLead(
        instagramId=str(user.get("id")) if user.get("id") else None,
        username=user.get("username") or username,
        fullName=user.get("full_name"),
        bio=user.get("biography"),
        website=user.get("external_url"),
        followerCount=((user.get("edge_followed_by") or {}).get("count") or 0),
        followingCount=((user.get("edge_follow") or {}).get("count") or 0),
        source=f"USERNAME:{username}",
    )

    contact = fetch_contact_details(client, user.get("id"))
    if contact:
        lead.publicEmail = contact.get("public_email") or contact.get("business_email") or lead.publicEmail
        lead.fullName = contact.get("full_name") or lead.fullName
        lead.bio = contact.get("biography") or lead.bio
        lead.website = contact.get("external_url") or lead.website
        lead.followerCount = contact.get("follower_count") or lead.followerCount
        lead.followingCount = contact.get("following_count") or lead.followingCount

    return ScrapeResponse(status="FOUND", leads=[lead], raw={"profile": info, "contact": contact})


def scrape_hashtag(hashtag: str, session_ids: list[str]) -> ScrapeResponse:
    hashtag = hashtag.strip().lstrip("#")
    client = build_client(session_ids)
    response = client.get_hashtag_posts(hashtag=hashtag, total=25)
    entries = (response or {}).get("data") or []
    leads: list[ScrapedLead] = []
    seen: set[str] = set()

    for entry in entries:
        owner = (((entry or {}).get("node") or {}).get("owner") or {})
        username = owner.get("username")
        if not username or username in seen:
            continue
        seen.add(username)
        leads.append(ScrapedLead(username=username, instagramId=str(owner.get("id")) if owner.get("id") else None, source=f"HASHTAG:{hashtag}"))

    return ScrapeResponse(status="FOUND", leads=leads, raw={"count": len(leads), "end_cursor": (response or {}).get("end_cursor")})


def build_client(session_ids: list[str]) -> InstaGPy:
    client = InstaGPy(use_mutiple_account=len(session_ids) > 1, session_ids=session_ids if len(session_ids) > 1 else None)
    client.generate_session(session_id=session_ids[0])
    return client


def fetch_contact_details(client: InstaGPy, user_id: str | None) -> dict[str, Any] | None:
    if not user_id:
        return None
    try:
        data = client.get_user_data(user_id)
        return (data or {}).get("user") or None
    except Exception:
        return None


def load_session_ids() -> list[str]:
    if not os.path.exists(COOKIE_FILE):
        raise RuntimeError("Instagram cookie file not found. Create apps/api/cookie.json with exported Instagram cookies.")

    with open(COOKIE_FILE, "r", encoding="utf-8") as file:
        payload = json.load(file)

    cookies = payload.get("cookies") if isinstance(payload, dict) else payload
    if not isinstance(cookies, list):
        raise RuntimeError("cookie.json must be a cookie array or a Playwright storageState object with cookies.")

    session_ids = [
        str(cookie.get("value"))
        for cookie in cookies
        if isinstance(cookie, dict) and cookie.get("name") == "sessionid" and cookie.get("value")
    ]
    if not session_ids:
        raise RuntimeError('cookie.json must contain at least one Instagram "sessionid" cookie.')
    return session_ids


def classify_error(error: Exception) -> ScrapeResponse:
    message = str(error)
    lowered = message.lower()

    if "not found" in lowered or "does not exist" in lowered or "page isn't available" in lowered:
        return ScrapeResponse(status="NOT_FOUND", error=message)
    if "login" in lowered or "challenge" in lowered or "checkpoint" in lowered:
        return ScrapeResponse(status="LOGIN_REQUIRED", error=message)
    if "wait a few minutes" in lowered or "rate" in lowered or "429" in lowered:
        return ScrapeResponse(status="RATE_LIMITED", error=message)
    if "forbidden" in lowered or "blocked" in lowered or "403" in lowered:
        return ScrapeResponse(status="BLOCKED", error=message)

    return ScrapeResponse(status="UNKNOWN", error=message)
