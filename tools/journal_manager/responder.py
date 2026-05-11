"""
Response generator — uses Claude API to draft journal emails.

Covers:
  - Accept editorial board appointment
  - Decline editorial board appointment (politely)
  - Accept reviewer invitation
  - Decline reviewer invitation
  - Acknowledge free publication offer (with or without committing to submit)
  - Decline publication offer

Requires ANTHROPIC_API_KEY. Degrades gracefully to plain-text templates if unavailable.
"""

from __future__ import annotations

import os
import sys
from typing import Optional

from .storage import JournalEntry
from .research_profile import RESEARCH_PROFILE

_MODEL = "claude-sonnet-4-6"
_KEY_ENV = "ANTHROPIC_API_KEY"


def _client():
    try:
        import anthropic
    except ImportError:
        return None
    key = os.environ.get(_KEY_ENV)
    if not key:
        return None
    return anthropic.Anthropic(api_key=key)


def _call(system: str, user: str) -> Optional[str]:
    client = _client()
    if client is None:
        return None
    try:
        msg = client.messages.create(
            model=_MODEL,
            max_tokens=600,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return msg.content[0].text
    except Exception as exc:
        print(f"  ✗  API call failed: {exc}", file=sys.stderr)
        return None


def draft_response(entry: JournalEntry, action: str) -> str:
    """
    action: accept_editor | decline_editor | accept_reviewer | decline_reviewer
            | acknowledge_offer | decline_offer
    Returns the drafted email body as a string.
    Falls back to a plain-text template if API is unavailable.
    """
    llm_draft = _llm_draft(entry, action)
    if llm_draft:
        return llm_draft
    return _template_draft(entry, action)


def _llm_draft(entry: JournalEntry, action: str) -> Optional[str]:
    action_descriptions = {
        "accept_editor": (
            "Accept the editorial board appointment graciously. "
            "Express genuine interest in the journal's domain if it matches the research. "
            "Keep it to 3 short paragraphs. Professional, not sycophantic."
        ),
        "decline_editor": (
            "Decline the editorial board appointment politely. "
            "Cite current research commitments as the reason. "
            "Leave the door open for future collaboration. "
            "2 short paragraphs. Do not over-apologise."
        ),
        "accept_reviewer": (
            "Accept the peer review invitation. "
            "Confirm you can meet the deadline. "
            "1-2 sentences is fine — reviewer acceptance emails are brief."
        ),
        "decline_reviewer": (
            "Decline the peer review invitation. "
            "Brief, professional, cite conflicting commitments. "
            "Optionally suggest they consider alternative reviewers if you can think of any. "
            "2-3 sentences."
        ),
        "acknowledge_offer": (
            "Acknowledge the free publication offer positively without committing to a specific submission. "
            "Say you have relevant work and will be in touch when ready to submit. "
            "2 paragraphs."
        ),
        "decline_offer": (
            "Politely decline the publication offer. "
            "Thank them for the interest. Do not explain in detail. "
            "2-3 sentences."
        ),
    }

    instructions = action_descriptions.get(action, "Write a professional response to this journal email.")

    system = (
        "You are drafting a professional academic email on behalf of a researcher. "
        "Write only the email body — no subject line, no [signature] placeholders, no commentary. "
        "End with: 'Kind regards,\\nKundai Farai Sachikonye'"
    )

    user = (
        f"ACTION: {instructions}\n\n"
        f"RESEARCHER: {RESEARCH_PROFILE['name']}\n"
        f"AFFILIATION: {RESEARCH_PROFILE['affiliation']}\n"
        f"RESEARCH DOMAINS: {', '.join(RESEARCH_PROFILE['domains'][:8])}\n\n"
        f"JOURNAL: {entry.journal_name}\n"
        f"PUBLISHER: {entry.publisher}\n"
        f"CATEGORY: {entry.category}\n"
        f"ROLE OFFERED: {entry.role or 'N/A'}\n"
        f"DOMAIN: {entry.domain}\n"
        f"ORIGINAL EMAIL SNIPPET:\n{entry.email_snippet[:400]}"
    )

    return _call(system, user)


def _template_draft(entry: JournalEntry, action: str) -> str:
    """Plain-text fallback templates — no API needed."""
    name = RESEARCH_PROFILE["name"]
    journal = entry.journal_name or "your journal"
    role = entry.role or "board member"

    templates = {
        "accept_editor": (
            f"Dear Editorial Team,\n\n"
            f"Thank you for your invitation to join the editorial board of {journal}. "
            f"I am pleased to accept and look forward to contributing to the review process in the domain of {entry.domain}.\n\n"
            f"Please let me know the next steps and any specific responsibilities expected of board members.\n\n"
            f"Kind regards,\n{name}"
        ),
        "decline_editor": (
            f"Dear Editorial Team,\n\n"
            f"Thank you for considering me for the editorial board of {journal}. "
            f"I appreciate the invitation. Unfortunately, due to current research commitments, "
            f"I am not in a position to take on additional editorial responsibilities at this time.\n\n"
            f"I hope to have the opportunity to collaborate in the future.\n\n"
            f"Kind regards,\n{name}"
        ),
        "accept_reviewer": (
            f"Dear Editors,\n\n"
            f"Thank you for the invitation to review for {journal}. "
            f"I am happy to serve as a reviewer and will submit my review by the stated deadline.\n\n"
            f"Kind regards,\n{name}"
        ),
        "decline_reviewer": (
            f"Dear Editors,\n\n"
            f"Thank you for the review invitation for {journal}. "
            f"Unfortunately I have conflicting commitments at this time and am unable to take on this review. "
            f"I apologise for any inconvenience.\n\n"
            f"Kind regards,\n{name}"
        ),
        "acknowledge_offer": (
            f"Dear Editors,\n\n"
            f"Thank you for reaching out and for the generous offer to publish in {journal} without an article processing charge. "
            f"I have relevant work in progress that may be suitable for your scope and will be in touch once the manuscript is ready for submission.\n\n"
            f"Kind regards,\n{name}"
        ),
        "decline_offer": (
            f"Dear Editors,\n\n"
            f"Thank you for your interest and for the kind offer. "
            f"I am not currently planning a submission at this time, but I appreciate you reaching out.\n\n"
            f"Kind regards,\n{name}"
        ),
    }

    return templates.get(action, f"Dear Editors,\n\nThank you for your email.\n\nKind regards,\n{name}")
