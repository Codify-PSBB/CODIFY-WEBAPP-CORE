#!/usr/bin/env python3
"""Deterministic SQLite checks for migration 0008 and its integrity triggers."""

from pathlib import Path
import sqlite3
import tempfile

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "database" / "migrations"


def apply(conn: sqlite3.Connection, number: int) -> None:
    path = next(MIGRATIONS.glob(f"{number:04d}_*.sql"))
    conn.executescript(path.read_text())


def base_through_0007() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    for number in range(1, 8):
        apply(conn, number)
    conn.execute("INSERT INTO users (id,name,email,role,xp,password_hash) VALUES (1,'A','a','member',0,'x'),(2,'B','b','member',0,'x')")
    conn.execute("INSERT INTO problems (id,title,description,xp_reward,active) VALUES (1,'P1','D',10,1),(2,'P2','D',10,1)")
    return conn


def expect_integrity(conn: sqlite3.Connection, sql: str, params: tuple, fragment: str) -> None:
    try:
        conn.execute(sql, params)
    except sqlite3.IntegrityError as exc:
        assert fragment in str(exc), (fragment, str(exc))
    else:
        raise AssertionError(f"expected IntegrityError containing {fragment!r}")


def test_fresh_schema() -> None:
    conn = sqlite3.connect(":memory:")
    for number in range(1, 9):
        apply(conn, number)
    assert conn.execute("PRAGMA integrity_check").fetchone()[0] == "ok"


def test_legacy_selection() -> None:
    conn = base_through_0007()
    conn.execute("INSERT INTO competitions (id,status,created_by) VALUES (1,'ended','admin'),(2,'ended','admin')")
    apply(conn, 8)
    assert conn.execute("SELECT COUNT(*) FROM competitions WHERE reset_at IS NULL").fetchone()[0] == 0

    conn = base_through_0007()
    conn.execute("INSERT INTO competitions (id,status,created_by) VALUES (1,'ended','admin'),(2,'live','admin')")
    apply(conn, 8)
    assert conn.execute("SELECT id FROM competitions WHERE reset_at IS NULL").fetchall() == [(2,)]

    conn = base_through_0007()
    conn.execute("INSERT INTO competitions (id,status,created_by) VALUES (1,'setup','admin'),(2,'live','admin')")
    try:
        apply(conn, 8)
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("migration 0008 must reject ambiguous setup/live rows")


def test_submission_and_problem_guards() -> None:
    conn = base_through_0007()
    conn.execute("INSERT INTO competitions (id,status,created_by,started_at) VALUES (1,'live','admin',CURRENT_TIMESTAMP)")
    conn.execute("INSERT INTO competition_problems (competition_id,problem_id) VALUES (1,1)")
    conn.execute("INSERT INTO submission_groups (id,user_id,competition_id) VALUES (1,1,1)")
    apply(conn, 8)

    insert = "INSERT INTO submissions (user_id,problem_id,code,competition_id,submission_group_id) VALUES (?,?,?,?,?)"
    expect_integrity(conn, insert, (2, 1, "x", 1, 1), "group mismatch")
    expect_integrity(conn, insert, (1, 2, "x", 1, 1), "does not belong")
    conn.execute(insert, (1, 1, "ok", 1, 1))
    expect_integrity(conn, "UPDATE submissions SET problem_id=2 WHERE code='ok'", (), "identity is immutable")
    expect_integrity(conn, "UPDATE problems SET xp_reward=99 WHERE id=1", (), "live competition problem")
    expect_integrity(conn, "DELETE FROM problems WHERE id=1", (), "live competition problem")

    conn.execute("UPDATE competitions SET status='ended', ended_at=CURRENT_TIMESTAMP WHERE id=1")
    expect_integrity(conn, insert, (1, 1, "late", 1, 1), "not live")
    conn.execute("UPDATE problems SET xp_reward=99 WHERE id=1")


def main() -> None:
    test_fresh_schema()
    test_legacy_selection()
    test_submission_and_problem_guards()
    print("Production integrity verification PASSED")


if __name__ == "__main__":
    main()
