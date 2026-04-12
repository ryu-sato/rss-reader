#!/usr/bin/env python3
"""
sentence-transformers または BM25 を使用したエントリーの嗜好スコア計算スクリプト。

このスクリプトは、データベースからユーザーの嗜好と未スコアリングのエントリーを読み込み、
選択したメソッドで各嗜好とエントリー間のスコアを計算し、
そのスコアを entry_preference_scores テーブルに書き戻します。

Usage:
    python score_entries.py [--db-path PATH] [--method METHOD] [--model MODEL]
                            [--batch-size N] [--limit N] [--interval SECONDS]

Environment variables:
    DATABASE_URL:          SQLite database URL (e.g. file:./prisma/dev.db)
                           Can also be a plain file path.
    SCORE_METHOD:          Scoring method: 'embeddings' or 'bm25'
    SCORE_MODEL:           Sentence-transformers model name
    SCORE_BATCH_SIZE:      Encoding batch size for embeddings method
    SCORE_FORCE:           Set to '1' or 'true' to re-score all entries
    SCORE_LIMIT:           Max entries to score per batch (0 = unlimited)
    SCORE_INTERVAL:        Seconds to sleep between batches
    SCORE_CHUNK_SIZE:      Entries per internal chunk (embeddings method only)
    SCORE_MAX_TEXT_CHARS:  Max characters per entry text before truncation
    SCORE_INSERT_CHUNK_SIZE: Score rows per executemany call
"""

import argparse
import gc
import os
import re
import sqlite3
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path


def _env_bool(name: str) -> bool:
    """Return True if environment variable is set to '1' or 'true' (case-insensitive)."""
    return os.environ.get(name, "").lower() in ("1", "true")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Score entries against user preferences",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--db-path",
        default=None,
        help="Path to SQLite database file. Defaults to DATABASE_URL env var or ./prisma/dev.db",
    )
    parser.add_argument(
        "--method",
        default=os.environ.get("SCORE_METHOD", "embeddings"),
        choices=["embeddings", "bm25"],
        help="Scoring method: 'embeddings' (sentence-transformers) or 'bm25' [env: SCORE_METHOD]",
    )
    parser.add_argument(
        "--model",
        default=os.environ.get(
            "SCORE_MODEL",
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        ),
        help="Sentence-transformers model name (embeddings method only) [env: SCORE_MODEL]",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=int(os.environ.get("SCORE_BATCH_SIZE", "64")),
        help="Encoding batch size for embeddings method [env: SCORE_BATCH_SIZE]",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        default=_env_bool("SCORE_FORCE"),
        help="Re-score entries even if a score already exists [env: SCORE_FORCE=1]",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=int(os.environ.get("SCORE_LIMIT", "0")),
        help="Max entries to score per batch (0 = unlimited) [env: SCORE_LIMIT]",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=float(os.environ.get("SCORE_INTERVAL", "0")),
        help=(
            "Seconds to sleep between batches when --limit is set. "
            "If 0 (default), process one batch and exit. [env: SCORE_INTERVAL]"
        ),
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=int(os.environ.get("SCORE_CHUNK_SIZE", "200")),
        help=(
            "Number of entries to process per internal chunk when --limit is 0 "
            "(embeddings method only) [env: SCORE_CHUNK_SIZE]"
        ),
    )
    parser.add_argument(
        "--max-text-chars",
        type=int,
        default=int(os.environ.get("SCORE_MAX_TEXT_CHARS", "2000")),
        help=(
            "Maximum characters per entry text before truncation. "
            "Reduces memory and speeds up encoding. [env: SCORE_MAX_TEXT_CHARS]"
        ),
    )
    parser.add_argument(
        "--insert-chunk-size",
        type=int,
        default=int(os.environ.get("SCORE_INSERT_CHUNK_SIZE", "500")),
        help=(
            "Number of score rows to insert per executemany call. "
            "Prevents large in-memory row lists when entries × prefs is high. "
            "[env: SCORE_INSERT_CHUNK_SIZE]"
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


def build_entry_text(
    title: str, description: str | None, content: str | None, max_chars: int = 0
) -> str:
    """Concatenate available text fields for embedding."""
    parts = [title]
    if description:
        parts.append(description)
    elif content:
        parts.append(content)
    text = "\n".join(parts)
    if max_chars > 0 and len(text) > max_chars:
        text = text[:max_chars]
    return text


def tokenize(text: str) -> list[str]:
    """Multilingual tokenizer for BM25.

    CJK characters are each treated as an individual token.
    Latin/numeric sequences are split into word tokens (lowercased).
    """
    return re.findall(
        r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]"
        r"|[a-zA-Z0-9]+",
        text.lower(),
    )


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


def score_with_embeddings(con: sqlite3.Connection, prefs: list, args) -> tuple[int, int]:
    """Score pending entries using sentence-transformers embeddings.

    Returns (total_scored, num_chunks).
    """
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

    fetch_size = args.limit if args.limit > 0 else args.chunk_size

    if args.limit > 0:
        print(f"[info] Batch limit: {args.limit} entries per batch")
        if args.interval > 0:
            print(f"[info] Interval: {args.interval}s between batches")
    else:
        print(f"[info] Processing in chunks of {fetch_size} to limit memory usage")

    total_scored = 0
    batch_num = 0
    pref_embeddings_T = pref_embeddings.T

    insert_sql = """
        INSERT OR IGNORE INTO entry_preference_scores
            (id, entryId, preferenceId, score, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
    """

    while True:
        entries = fetch_pending_entries(con, fetch_size)
        if not entries:
            print("[info] All entries scored.")
            break

        batch_num += 1
        print(f"[info] Chunk {batch_num}: scoring {len(entries)} entries ...")

        entry_texts = [
            build_entry_text(
                row["title"], row["description"], row["content"], args.max_text_chars
            )
            for row in entries
        ]
        entry_embeddings = model.encode(
            entry_texts,
            batch_size=args.batch_size,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        del entry_texts

        # cosine similarity = dot product when embeddings are L2-normalized
        # shape: (num_entries, num_prefs)
        scores_matrix = np.dot(entry_embeddings, pref_embeddings_T)
        del entry_embeddings
        gc.collect()

        now = now_iso()

        def _score_rows(entries, prefs, scores_matrix, now):
            for ei, entry in enumerate(entries):
                for pi, pref in enumerate(prefs):
                    yield (
                        str(uuid.uuid4()),
                        entry["id"],
                        pref["id"],
                        float(scores_matrix[ei, pi]),
                        now,
                        now,
                    )

        row_gen = _score_rows(entries, prefs, scores_matrix, now)
        buf = []
        for row in row_gen:
            buf.append(row)
            if len(buf) >= args.insert_chunk_size:
                con.executemany(insert_sql, buf)
                buf.clear()
        if buf:
            con.executemany(insert_sql, buf)

        del scores_matrix
        gc.collect()

        total_scored += len(entries)
        del entries

        con.commit()

        if args.limit > 0:
            if args.interval > 0:
                print(f"[info] Sleeping {args.interval}s before next batch ...")
                time.sleep(args.interval)
            else:
                print("[info] Batch complete. Run again to process remaining entries.")
                break

    return total_scored, batch_num


def score_with_bm25(con: sqlite3.Connection, prefs: list, args) -> tuple[int, int]:
    """Score pending entries using BM25 ranking.

    BM25 requires the full corpus to compute IDF, so all pending entries are
    fetched at once (respecting --limit).  Scores are normalized to [0, 1]
    per query (preference) by dividing by the maximum raw BM25 score.

    Returns (total_scored, 1).
    """
    try:
        from rank_bm25 import BM25Okapi
        import numpy as np
    except ImportError:
        print(
            "[error] rank-bm25 is not installed.\n"
            "Run: pip install rank-bm25  (or add it to requirements.txt)",
            file=sys.stderr,
        )
        sys.exit(1)

    fetch_size = args.limit if args.limit > 0 else 0
    print("[info] BM25 mode: loading pending entries ...")
    entries = fetch_pending_entries(con, fetch_size)
    if not entries:
        return 0, 0

    print(f"[info] Tokenizing {len(entries)} entries ...")
    entry_texts = [
        build_entry_text(
            row["title"], row["description"], row["content"], args.max_text_chars
        )
        for row in entries
    ]
    tokenized_corpus = [tokenize(text) for text in entry_texts]
    del entry_texts

    print("[info] Building BM25 index ...")
    bm25 = BM25Okapi(tokenized_corpus)
    del tokenized_corpus
    gc.collect()

    insert_sql = """
        INSERT OR IGNORE INTO entry_preference_scores
            (id, entryId, preferenceId, score, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)
    """
    now = now_iso()

    for pref in prefs:
        query_tokens = tokenize(pref["text"])
        raw_scores = bm25.get_scores(query_tokens)  # numpy array, length = len(entries)

        max_score = float(raw_scores.max())
        normalized = raw_scores / max_score if max_score > 0 else raw_scores

        buf = []
        for ei, entry in enumerate(entries):
            buf.append((
                str(uuid.uuid4()),
                entry["id"],
                pref["id"],
                float(normalized[ei]),
                now,
                now,
            ))
            if len(buf) >= args.insert_chunk_size:
                con.executemany(insert_sql, buf)
                buf.clear()
        if buf:
            con.executemany(insert_sql, buf)

    con.commit()
    gc.collect()

    return len(entries), 1


def main():
    args = parse_args()
    db_path = resolve_db_path(args.db_path)

    if not db_path.exists():
        print(f"[error] Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)

    print(f"[info] Using database: {db_path}")
    print(f"[info] Scoring method: {args.method}")

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

    if args.method == "bm25":
        total_scored, batch_num = score_with_bm25(con, prefs, args)
    else:
        total_scored, batch_num = score_with_embeddings(con, prefs, args)

    con.close()
    print(f"[info] Done. Scored {total_scored} entry/entries in {batch_num} chunk(s).")


if __name__ == "__main__":
    main()
