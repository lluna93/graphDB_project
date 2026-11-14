
import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from neo4j import GraphDatabase

# 프로젝트 루트 경로
BASE_DIR = Path(__file__).resolve().parent

# 프로젝트 루트의 .env 파일을 명시적으로 로딩
load_dotenv(BASE_DIR / ".env")

EXCEL_PATH = BASE_DIR / "data" / "판매데이터.xlsx"

URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PASSWORD = os.environ["NEO4J_PASSWORD"]
DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

BATCH_SIZE = 500
