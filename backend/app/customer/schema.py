
from typing import Any
from pydantic import BaseModel, Field


class Customer(BaseModel):
    code: int
    name: str


class GraphNode(BaseModel):
    id: str
    label: str
    name: str
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphLink(BaseModel):
    source: str
    target: str
    type: str


class CustomerGraphResponse(BaseModel):
    customers: list[Customer]
    selected_customer: int | None = None
    nodes: list[GraphNode]
    links: list[GraphLink]
