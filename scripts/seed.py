import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.security import hash_password


def main() -> None:
    seed_password = os.environ["SEED_ADMIN_PASSWORD"]
    password_hash = hash_password(seed_password)
    print("Seed admin password hash:")
    print(password_hash)


if __name__ == "__main__":
    main()
