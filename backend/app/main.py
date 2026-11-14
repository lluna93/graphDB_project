
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import get_driver, close_driver

# 고객 관계 분석 API
from app.customer.api import router as customer_router

# 마케팅 분석 API (커뮤니티 탐지 포함)
from app.marketing.api import router as marketing_router


# --------------------------------------------------
# 1. 애플리케이션 시작 / 종료
# --------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 시 Neo4j 연결 확인
    driver = get_driver()
    driver.verify_connectivity()

    print("[Neo4j] 연결 성공")

    yield

    # 서버 종료 시 연결 정리
    close_driver()
    print("[Neo4j] 연결 종료")


# --------------------------------------------------
# 2. FastAPI 생성
# --------------------------------------------------
app = FastAPI(
    title="Neo4j Marketing Analytics API",
    description=(
        "Neo4j 기반 고객 관계 분석, "
        "연관 구매 분석 및 고객 커뮤니티 탐지 API"
    ),
    version="1.0.0",
    lifespan=lifespan,
)


# --------------------------------------------------
# 3. CORS 설정
# --------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# 4. API 라우터 등록
# --------------------------------------------------
app.include_router(customer_router)
app.include_router(marketing_router)


# --------------------------------------------------
# 5. 기본 API
# --------------------------------------------------
@app.get("/", tags=["System"])
def root():
    return {
        "message": "Neo4j Marketing Analytics API",
        "status": "running",
    }


@app.get("/health", tags=["System"])
def health():
    return {
        "status": "ok",
    }
