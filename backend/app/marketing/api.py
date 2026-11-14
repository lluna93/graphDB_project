
from fastapi import APIRouter, Query

from app.marketing.community_service import (
    get_customer_communities,
)
from app.marketing.community_schema import (
    CommunityResponse,
)

from fastapi import HTTPException

from app.marketing.recommendation_service import (
    get_customer_recommendations,
)


router = APIRouter(
    prefix="/api/marketing",
    tags=["Marketing"],
)


@router.get(
    "/communities",
    response_model=CommunityResponse,
)
def communities(
    min_similarity: float = Query(
        default=0.2,
        ge=0.01,
        le=1.0,
    ),
    top_products: int = Query(
        default=5,
        ge=1,
        le=20,
    ),
):
    return get_customer_communities(
        min_similarity=min_similarity,
        top_products=top_products,
    )



from app.marketing.insight_service import (
    get_community_insights,
)


@router.get("/communities/insights")
def community_insights(
    min_similarity: float = Query(
        default=0.2,
        ge=0.01,
        le=1.0,
    ),
    top_products: int = Query(
        default=5,
        ge=1,
        le=20,
    ),
    target_limit: int = Query(
        default=30,
        ge=1,
        le=200,
    ),
):
    return get_community_insights(
        min_similarity=min_similarity,
        top_products=top_products,
        target_limit=target_limit,
    )





@router.get("/customers/{customer_code}/recommendations")
def customer_recommendations(
    customer_code: str,
    min_similarity: float = Query(
        default=0.2,
        ge=0.01,
        le=1.0,
    ),
    top_k: int = Query(
        default=3,
        ge=1,
        le=10,
    ),
):
    result = get_customer_recommendations(
        customer_code=customer_code,
        min_similarity=min_similarity,
        top_k=top_k,
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="고객을 찾을 수 없습니다.",
        )

    return result
