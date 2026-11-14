
from fastapi import APIRouter, Query

from app.customer.schema import CustomerGraphResponse
from app.customer.service import get_customer_graph

router = APIRouter(
    prefix="/api/customers",
    tags=["Customers"]
)


@router.get(
    "/graph",
    response_model=CustomerGraphResponse
)
def customer_graph(
    customer_code: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
):
    return get_customer_graph(
        customer_code=customer_code,
        limit=limit,
    )
