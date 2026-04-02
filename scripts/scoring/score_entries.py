#!/usr/bin/env python3
"""
sentence-transformers を使用したエントリーの嗜好スコア計算スクリプト。

このスクリプトは、データベースからユーザーの嗜好と未スコアリングのエントリーを読み込み、
sentence-transformers を使用して各嗜好とエントリー間のコサイン類似度を計算し、
そのスコアを entry_preference_scores テーブルに書き戻します。

Usage:
    python score_entries.py [--db-path PATH] [--model MODEL] [--batch-size N]
                            [--limit N] [--interval SECONDS]

Environment variables:
    DATABASE_URL: SQLite database URL (e.g. file:./prisma/dev.db)
                  Can also be a plain file path.
"""

import argparse
import os
import re
import sqlite3
import sys
import time
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
        default="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
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
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Max entries to score per batch (default: 0 = unlimited)",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=0,
        help=(
            "Seconds to sleep between batches when --limit is set. "
            "If 0 (default), process one batch and exit."
        ),
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


def fetch_pending_entries(con: sqlite3.Connection, limit: int) -> list:
    """Fetch entries that have at least one preference without a score."""
    query_limit = limit if limit > 0 else -1  # -1 = no limit in SQLite
    return con.execute(
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
        ORDER BY e.id
        LIMIT ?
        """,
        (query_limit,),
    ).fetchall()


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
    prefs = con.execute("SELECT id, text, updatedAt FROM user_preferences").fetchall()
    if not prefs:
        print("[info] No user preferences found. Nothing to score.")
        con.close()
        return

    print(f"[info] Found {len(prefs)} preference(s)")

    # Determine which preferences have changed since last scoring,
    # then delete their stale scores so they will be re-scored uniformly.
    if args.force:
        con.execute("DELETE FROM entry_preference_scores")
        con.commit()
        print("[info] --force: cleared all existing scores")
    else:
        changed_prefs = []
        unchanged_count = 0
        for pref in prefs:
            last_scored = con.execute(
                "SELECT MAX(updatedAt) FROM entry_preference_scores WHERE preferenceId = ?",
                (pref["id"],),
            ).fetchone()[0]
            if last_scored is None or pref["updatedAt"] > last_scored:
                changed_prefs.append(pref)
            else:
                unchanged_count += 1

        if changed_prefs:
            for pref in changed_prefs:
                con.execute(
                    "DELETE FROM entry_preference_scores WHERE preferenceId = ?",
                    (pref["id"],),
                )
            con.commit()
            print(f"[info] {len(changed_prefs)} preference(s) changed → stale scores cleared")
        if unchanged_count:
            print(f"[info] {unchanged_count} preference(s) unchanged → existing scores kept")

    # Check upfront whether there is anything to process
    pending_check = fetch_pending_entries(con, limit=1)
    if not pending_check:
        print("[info] All entries already scored. Use --force to re-score.")
        con.close()
        return

    print(f"[info] Loading model: {args.model}")
    model = SentenceTransformer(args.model)

    # Encode preferences once — they don't change during the run
    pref_texts = [row["text"] for row in prefs]
    print(f"[info] Encoding {len(prefs)} preference(s) ...")
    pref_embeddings = model.encode(
        pref_texts,
        batch_size=args.batch_size,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    if args.limit > 0:
        print(f"[info] Batch limit: {args.limit} entries per batch")
        if args.interval > 0:
            print(f"[info] Interval: {args.interval}s between batches")

    total_scored = 0
    batch_num = 0

    while True:
        entries = fetch_pending_entries(con, args.limit)
        if not entries:
            print("[info] All entries scored.")
            break

        batch_num += 1
        if args.limit > 0:
            print(f"[info] Batch {batch_num}: scoring {len(entries)} entries ...")
        else:
            print(f"[info] Encoding {len(entries)} entry/entries ...")

        entry_texts = [
            build_entry_text(row["title"], row["description"], row["content"])
            for row in entries
        ]
        entry_embeddings = model.encode(
            entry_texts,
            batch_size=args.batch_size,
            normalize_embeddings=True,
            show_progress_bar=(args.limit == 0),  # progress bar only for single full run
        )

        # cosine similarity = dot product when embeddings are L2-normalized
        # shape: (num_entries, num_prefs)
        scores_matrix = np.dot(entry_embeddings, np.array(pref_embeddings).T)

        now = now_iso()
        for entry_idx, entry in enumerate(entries):
            entry_id = entry["id"]
            for pref_idx, pref in enumerate(prefs):
                pref_id = pref["id"]
                score = float(scores_matrix[entry_idx, pref_idx])
                con.execute(
                    """
                    INSERT OR IGNORE INTO entry_preference_scores
                        (id, entryId, preferenceId, score, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (str(uuid.uuid4()), entry_id, pref_id, score, now, now),
                )

        # Commit after each batch so progress is preserved on interruption
        con.commit()
        total_scored += len(entries)

        # Exit loop when no limit is set, or the batch was smaller than the limit
        # (meaning there are no more entries to process)
        if args.limit == 0 or len(entries) < args.limit:
            break

        # More entries remain — sleep if interval is set, otherwise stop
        if args.interval > 0:
            print(f"[info] Sleeping {args.interval}s before next batch ...")
            time.sleep(args.interval)
        else:
            print(
                f"[info] Batch complete ({total_scored} scored so far). "
                "Run again to process remaining entries."
            )
            break

    con.close()
    print(f"[info] Done. Scored {total_scored} entry/entries in {batch_num} batch(es).")


if __name__ == "__main__":
    main()
