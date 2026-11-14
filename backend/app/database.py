
import os
from pathlib import Path

from dotenv import load_dotenv
from neo4j import GraphDatabase


# 1. 프로젝트 루트 경로
# database.py → app → backend → graphDB_project
BASE_DIR = Path(__file__).resolve().parents[2]

# 2. .env 경로
ENV_PATH = BASE_DIR / ".env"

# 3. 환경변수 로딩
if not ENV_PATH.is_file():
    raise FileNotFoundError(
        f".env 파일을 찾을 수 없습니다: {ENV_PATH}"
    )

load_dotenv(dotenv_path=ENV_PATH, override=True)

# 4. Neo4j 접속 정보
NEO4J_URI = os.getenv(
    "NEO4J_URI", "bolt://localhost:7687"
)
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

# 5. 비밀번호 검증
if not NEO4J_PASSWORD:
    raise ValueError(
        f"NEO4J_PASSWORD가 설정되지 않았습니다. "
        f".env 파일을 확인하세요: {ENV_PATH}"
    )

# 6. Neo4j 연결
driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USER, NEO4J_PASSWORD),
)


def get_driver():
    return driver


def close_driver():
    driver.close()


DATABASE = NEO4J_DATABASE
