#!/usr/bin/env python3
"""
sentence-transformers を使用したエントリーの嗜好スコア計算スクリプト。

このスクリプトは、データベースからユーザーの嗜好と未スコアリングのエントリーを読み込み、
sentence-transformers を使用して各嗜好とエントリー間のコサイン類似度を計算し、
そのスコアを entry_preference_scores テーブルに書き戻します。

Usage:
    python score_entries.py [--db-path PATH] [--model MODEL] [--batch-size N]

Environment variables:
    DATABASE_URL: SQLite database URL (e.g. file:./prisma/dev.db)
                  Can also be a plain file path.
"""

import argparse
import os
import re
import sqlite3
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(description="Score entries against user preferences")
    parser.add_argument(
        "--db-path",
        default=None,
        help="Path to SQLite database file. Defaults to DATABASE_URL env var or ./prisma/dev.db",
    )
    parser.add_argument(
        "--model",
        default="sentence-transformers/paraphrase-multilingual-mpnet-base-v2",
        help="Sentence-transformers model name (default: paraphrase-multilingual-mpnet-base-v2)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=64,
        help="Encoding batch size (default: 64)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-score entries even if a score already exists",
    )
    return parser.parse_args()


def resolve_db_path(db_path_arg: str | None) -> Path:
    if db_path_arg:
        return Path(db_path_arg)

    database_url = os.environ.get("DATABASE_URL", "")
    # Strip libsql:// or file: prefixes
    match = re.match(r"^(?:file:|libsql://)?(.+)$", database_url)
    if match:
        candidate = Path(match.group(1))
        if candidate.exists():
            return candidate

    # Default location relative to this script's repo root
    script_dir = Path(__file__).resolve().parent
    default = script_dir.parent.parent / "prisma" / "dev.db"
    return default


def build_entry_text(title: str, description: str | None, content: str | None) -> str:
    """Concatenate available text fields for embedding."""
    parts = [title]
    if description:
        parts.append(description)
    elif content:
        parts.append(content)
    return "\n".join(parts)


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")


def main():
    args = parse_args()
    db_path = resolve_db_path(args.db_path)

    if not db_path.exists():
        print(f"[error] Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    print(f"[info] Using database: {db_path}")

    # Lazy import so startup is fast when showing --help
    try:
        from sentence_transformers import SentenceTransformer
        import numpy as np
    except ImportError:
        print(
            "[error] Required packages not installed.\n"
            "Run: pip install -r scripts/scoring/requirements.txt",
            file=sys.stderr,
        )
        sys.exit(1)

    con = sqlite3.connect(str(db_path))
    con.row_factory = sqlite3.Row

    # Load preferences
    prefs = con.execute("SELECT id, text FROM user_preferences").fetchall()
    if not prefs:
        print("[info] No user preferences found. Nothing to score.")
        con.close()
        return

    print(f"[info] Found {len(prefs)} preference(s)")

    # Load entries
    if args.force:
        entries = con.execute(
            "SELECT id, title, description, content FROM entries"
        ).fetchall()
    else:
        # Only entries that have at least one preference without a score
        entries = con.execute(
            """
            SELECT DISTINCT e.id, e.title, e.description, e.content
            FROM entries e
            WHERE EXISTS (
                SELECT 1 FROM user_preferences p
                WHERE NOT EXISTS (
                    SELECT 1 FROM entry_preference_scores s
                    WHERE s.entryId = e.id AND s.preferenceId = p.id
                )
            )
            """
        ).fetchall()

    if not entries:
        print("[info] All entries already scored. Use --force to re-score.")
        con.close()
        return

    print(f"[info] Loading model: {args.model}")
    model = SentenceTransformer(args.model)

    pref_texts = [row["text"] for row in prefs]
    entry_texts = [
        build_entry_text(row["title"], row["description"], row["content"])
        for row in entries
    ]

    print(f"[info] Encoding {len(prefs)} preference(s) ...")
    pref_embeddings = model.encode(pref_texts, batch_size=args.batch_size, normalize_embeddings=True, show_progress_bar=False)

    print(f"[info] Encoding {len(entries)} entry/entries ...")
    entry_embeddings = model.encode(entry_texts, batch_size=args.batch_size, normalize_embeddings=True, show_progress_bar=True)

    # cosine similarity = dot product when embeddings are L2-normalized
    # shape: (num_entries, num_prefs)
    scores_matrix = np.dot(entry_embeddings, np.array(pref_embeddings).T)

    now = now_iso()
    rows_upserted = 0

    for entry_idx, entry in enumerate(entries):
        entry_id = entry["id"]
        for pref_idx, pref in enumerate(prefs):
            pref_id = pref["id"]
            score = float(scores_matrix[entry_idx, pref_idx])

            if args.force:
                con.execute(
                    """
                    INSERT INTO entry_preference_scores (id, entryId, preferenceId, score, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(entryId, preferenceId) DO UPDATE SET
                        score = excluded.score,
                        updatedAt = excluded.updatedAt
                    """,
                    (str(uuid.uuid4()), entry_id, pref_id, score, now, now),
                )
            else:
                con.execute(
                    """
                    INSERT OR IGNORE INTO entry_preference_scores (id, entryId, preferenceId, score, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (str(uuid.uuid4()), entry_id, pref_id, score, now, now),
                )
            rows_upserted += 1

    con.commit()
    con.close()

    print(f"[info] Done. Upserted {rows_upserted} score(s).")


if __name__ == "__main__":
    main()
