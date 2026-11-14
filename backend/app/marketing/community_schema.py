
from pydantic import BaseModel, Field


class TopProduct(BaseModel):
    code: str
    name: str
    customer_count: int
    penetration: float


class CommunitySummary(BaseModel):
    community_id: int
    segment_name: str
    customer_count: int
    top_products: list[TopProduct]


class CommunityNode(BaseModel):
    id: str
    label: str
    name: str
    community_id: int
    product_count: int
    degree: int


class CommunityLink(BaseModel):
    source: str
    target: str
    type: str
    weight: float
    common_products: int


class CommunityResponse(BaseModel):
    total_customers: int
    community_count: int
    connected_customers: int
    isolated_customers: int
    edge_count: int

    communities: list[CommunitySummary] = Field(
        default_factory=list
    )
    nodes: list[CommunityNode] = Field(
        default_factory=list
    )
    links: list[CommunityLink] = Field(
        default_factory=list
    )
