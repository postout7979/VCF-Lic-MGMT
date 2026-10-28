import os
import subprocess
from urllib.parse import urlparse

from app.core.config import settings


class BackupError(Exception):
    pass


def _connection_parts() -> dict[str, str]:
    parsed = urlparse(settings.database_url)
    return {
        "host": parsed.hostname or "localhost",
        "port": str(parsed.port or 5432),
        "user": parsed.username or "",
        "password": parsed.password or "",
        "dbname": (parsed.path or "/").lstrip("/"),
    }


def create_backup() -> bytes:
    """A full pg_dump of the database, including DROP/CREATE statements
    (--clean --if-exists) so restoring it replaces existing data cleanly."""
    parts = _connection_parts()
    env = {**os.environ, "PGPASSWORD": parts["password"]}
    try:
        result = subprocess.run(
            [
                "pg_dump",
                "-h", parts["host"],
                "-p", parts["port"],
                "-U", parts["user"],
                "-d", parts["dbname"],
                "--clean",
                "--if-exists",
            ],
            capture_output=True,
            env=env,
            timeout=120,
        )
    except subprocess.TimeoutExpired as err:
        raise BackupError("백업 생성이 시간 초과되었습니다.") from err
    if result.returncode != 0:
        raise BackupError(result.stderr.decode(errors="replace"))
    return result.stdout


def restore_backup(sql: bytes) -> None:
    """Runs a pg_dump SQL script back against the database, as a single
    transaction (-1) that aborts entirely (ON_ERROR_STOP) on any error.
    A short lock_timeout means a blocked DROP/ALTER (e.g. another request
    or the sync scheduler still holding a table open) fails fast with a
    clean rollback instead of hanging for the full subprocess timeout."""
    parts = _connection_parts()
    env = {**os.environ, "PGPASSWORD": parts["password"], "PGOPTIONS": "-c lock_timeout=10000"}
    try:
        result = subprocess.run(
            [
                "psql",
                "-h", parts["host"],
                "-p", parts["port"],
                "-U", parts["user"],
                "-d", parts["dbname"],
                "-1",
                "-v", "ON_ERROR_STOP=1",
            ],
            input=sql,
            capture_output=True,
            env=env,
            timeout=60,
        )
    except subprocess.TimeoutExpired as err:
        raise BackupError("복구가 시간 초과되었습니다. 데이터는 변경되지 않았습니다.") from err
    if result.returncode != 0:
        raise BackupError(result.stderr.decode(errors="replace"))
