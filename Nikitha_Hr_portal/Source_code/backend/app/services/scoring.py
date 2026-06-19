"""
scoring.py  –  backend/app/services/scoring.py
Nikitha Build-Tech Private Limited

FIX v2: Pylance "reportMissingImports" persisted on line 48 because
Pylance DOES analyse code inside `if TYPE_CHECKING:` blocks — that is
literally the purpose of the block. So putting the import there just
moved the error without fixing it.

CORRECT FIX:
  1. Add a pyrightconfig.json (or pyrightconfig section in pyproject.toml)
     that adds backend/ to the Pylance extraPaths. This is the proper,
     project-wide fix and makes ALL imports from backend/ resolve correctly.

  2. As a per-file fallback: use `# type: ignore[import]` on the import
     line so Pylance suppresses the warning without needing config changes.

  3. Runtime robustness: 3-layer sys.path fallback so the import works
     regardless of which directory uvicorn/gunicorn is launched from.

RECOMMENDED: Apply Fix 1 (pyrightconfig.json) — it fixes the root cause
for every file in your project, not just this one. Fix 2 is the
per-file band-aid if you cannot change project config.
"""

import re
import os
import sys

# ── Runtime import with 3-layer fallback ────────────────────────────
_ENGINE = False
_ats_score = None

try:
    # Layer 1: direct import
    # Works when uvicorn is launched from backend/ (backend/ is on sys.path)
    # `# type: ignore[import]` suppresses the Pylance warning on this line
    from ats_engine import calculate_ats_score as _ats_score  # type: ignore[import]
    _ENGINE = True

except ImportError:
    try:
        # Layer 2: add backend/ root to sys.path explicitly, then retry.
        # Handles the case where uvicorn runs from the project root.
        _backend_root = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..")
        )
        if _backend_root not in sys.path:
            sys.path.insert(0, _backend_root)

        from ats_engine import calculate_ats_score as _ats_score  # type: ignore[import]
        _ENGINE = True

    except ImportError:
        _ENGINE = False
        print(
            "[scoring.py] WARNING: ats_engine not found. "
            "Falling back to simple keyword overlap scoring. "
            f"Searched sys.path: {sys.path}"
        )


# ── stopwords to strip from any raw-word skills list ─────────────────
_STOPWORDS = {
    "the", "and", "for", "with", "are", "that", "this", "from", "have",
    "will", "all", "any", "each", "into", "its", "our", "their", "been",
    "has", "was", "not", "can", "but", "use", "also", "more", "such",
    "per", "via", "etc", "both", "only", "well", "new", "may", "must",
    "job", "code", "codes", "fire", "month", "strong", "practical",
}


# ── Lightweight fallback scorer ───────────────────────────────────────
def _fallback_score(resume_text: str, jd_text: str) -> float:
    """Simple word-overlap score (0–100). Used when ats_engine is absent."""
    def tokenize(text: str) -> set[str]:
        words = re.findall(r"[a-z]{3,}", text.lower())
        return {w for w in words if w not in _STOPWORDS}

    r_words = tokenize(resume_text)
    j_words = tokenize(jd_text)
    if not j_words:
        return 0.0
    return round(len(r_words & j_words) / len(j_words) * 100, 2)


# ── Public API ────────────────────────────────────────────────────────
def calculate_score(resume_text: str, jd_text: str) -> float:
    """
    Return ATS score (0–100) for a resume against a job description.
    Uses full ats_engine when available, fallback word-overlap otherwise.
    """
    if _ENGINE and _ats_score is not None:
        result = _ats_score(resume_text, jd_text)
        if isinstance(result, dict):
            return float(result.get("ats_score", 0))
        return float(result)
    return _fallback_score(resume_text, jd_text)


def engine_available() -> bool:
    """Returns True if the full ats_engine is loaded and active."""
    return _ENGINE