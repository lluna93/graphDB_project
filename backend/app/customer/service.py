
from datetime import date, datetime, time
from decimal import Decimal

from neo4j.time import Date, DateTime, Time, Duration

from app.database import get_driver, DATABASE


# ============================================================
# 1. Neo4j 데이터 → JSON 변환
# ============================================================

def serialize(value):
    """Neo4j 속성을 JSON으로 변환"""

    if value is None:
        return None

    if isinstance(
        value,
        (date, datetime, time, Date, DateTime, Time)
    ):
        return value.isoformat()

    if isinstance(value, Duration):
        return str(value)

    if isinstance(value, Decimal):
        return float(value)

    if isinstance(value, (list, tuple)):
        return [serialize(v) for v in value]

    if isinstance(value, dict):
        return {
            str(k): serialize(v)
            for k, v in value.items()
        }

    return value


# ============================================================
# 2. 노드별 이름 / ID 속성 정의
# ============================================================

NAME_KEYS = {
    "고객": "고객명",
    "지역": "지역",
    "판매": "판매ID",
    "제품": "제품명",
    "제품분류": "제품분류명",
    "분류": "분류명",
    "채널": "채널명",
    "프로모션": "프로모션",
}

ID_KEYS = {
    "고객": "고객코드",
    "지역": "지역코드",
    "판매": "판매ID",
    "제품": "제품코드",
    "제품분류": "제품분류코드",
    "분류": "분류코드",
    "채널": "채널코드",
    "프로모션": "프로모션코드",
}


# ============================================================
# 3. 노드 추가
# ============================================================

def add_node(node, nodes):
    """
    Neo4j Node → React 그래프 Node 변환
    """

    if node is None:
        return None

    labels = list(node.labels)
    label = labels[0] if labels else "기타"

    props = dict(node)

    id_key = ID_KEYS.get(label)
    id_value = props.get(id_key)

    if id_value is not None:
        node_id = f"{label}:{id_value}"
    else:
        node_id = f"{label}:{node.element_id}"

    name_key = NAME_KEYS.get(label)
    name = props.get(name_key)

    if name is None:
        name = node_id

    nodes[node.element_id] = {
        "id": node_id,
        "label": label,
        "name": str(name),
        "properties": serialize(props),
    }

    return node_id


# ============================================================
# 4. 관계 추가
# ============================================================

def add_relationship(
    source_node,
    relationship,
    target_node,
    nodes,
    links,
):
    """
    시작 노드 + 관계 + 종료 노드를 그래프에 추가
    """

    if (
        source_node is None
        or relationship is None
        or target_node is None
    ):
        return

    source_id = add_node(source_node, nodes)
    target_id = add_node(target_node, nodes)

    links[relationship.element_id] = {
        "source": source_id,
        "target": target_id,
        "type": relationship.type,
    }


# ============================================================
# 5. Cypher 조회 결과를 그래프에 추가
# ============================================================

def append_graph_records(result, nodes, links):
    """
    Cypher 결과는 다음 형태로 통일

    RETURN source, r, target
    """

    for record in result:
        add_relationship(
            source_node=record["source"],
            relationship=record["r"],
            target_node=record["target"],
            nodes=nodes,
            links=links,
        )


# ============================================================
# 6. 고객 관계 그래프 조회
# ============================================================

def get_customer_graph(
    customer_code: int | None,
    limit: int = 50,
):
    driver = get_driver()

    with driver.session(database=DATABASE) as session:

        # ----------------------------------------------------
        # STEP 1. 전체 고객 목록 조회
        # ----------------------------------------------------

        customer_result = session.run("""
            MATCH (c:고객)
            WHERE c.고객코드 IS NOT NULL

            RETURN
                c.고객코드 AS code,
                c.고객명 AS name

            ORDER BY name, code
        """)

        customers = [
            {
                "code": int(row["code"]),
                "name": str(
                    row["name"]
                    if row["name"] is not None
                    else row["code"]
                ),
            }
            for row in customer_result
        ]

        # 고객 미선택 시 고객 목록만 반환
        if customer_code is None:
            return {
                "customers": customers,
                "selected_customer": None,
                "nodes": [],
                "links": [],
            }

        nodes = {}
        links = {}

        code = str(customer_code)

        # ----------------------------------------------------
        # STEP 2. 선택 고객 조회
        # ----------------------------------------------------

        customer_record = session.run("""
            MATCH (c:고객)
            WHERE toString(c.고객코드) = $code

            RETURN c
            LIMIT 1
        """, code=code).single()

        if customer_record is None:
            return {
                "customers": customers,
                "selected_customer": customer_code,
                "nodes": [],
                "links": [],
            }

        customer = customer_record["c"]

        add_node(customer, nodes)

        # ----------------------------------------------------
        # STEP 3. 고객 → 지역
        # ----------------------------------------------------

        region_result = session.run("""
            MATCH (source:고객)-[r:거주지역]->(target:지역)
            WHERE toString(source.고객코드) = $code

            RETURN source, r, target
        """, code=code)

        append_graph_records(region_result, nodes, links)

        # ----------------------------------------------------
        # STEP 4. 고객 → 판매
        # ----------------------------------------------------

        sales_result = session.run("""
            MATCH (source:고객)-[r:구매]->(target:판매)
            WHERE toString(source.고객코드) = $code

            RETURN source, r, target

            ORDER BY target.날짜 DESC, target.판매ID
            LIMIT $limit
        """, code=code, limit=limit)

        sale_ids = []

        for record in sales_result:
            add_relationship(
                record["source"],
                record["r"],
                record["target"],
                nodes,
                links,
            )

            sale_ids.append(
                record["target"].element_id
            )

        # ----------------------------------------------------
        # STEP 5. 판매 → 제품 / 채널 / 프로모션
        # ----------------------------------------------------

        if sale_ids:

            sale_detail_result = session.run("""
                MATCH (source:판매)-[r]->(target)
                WHERE elementId(source) IN $sale_ids

                AND type(r) IN [
                    '판매제품',
                    '판매채널',
                    '적용프로모션'
                ]

                RETURN source, r, target
            """, sale_ids=sale_ids)

            append_graph_records(
                sale_detail_result,
                nodes,
                links,
            )

            # ------------------------------------------------
            # STEP 6. 제품 → 제품분류
            # ------------------------------------------------

            product_category_result = session.run("""
                MATCH (sale:판매)-[:판매제품]->(source:제품)
                WHERE elementId(sale) IN $sale_ids

                MATCH (source)-[r:소속제품분류]->(target:제품분류)

                RETURN DISTINCT source, r, target
            """, sale_ids=sale_ids)

            append_graph_records(
                product_category_result,
                nodes,
                links,
            )

            # ------------------------------------------------
            # STEP 7. 제품분류 → 분류
            # ------------------------------------------------

            category_result = session.run("""
                MATCH (sale:판매)-[:판매제품]->(product:제품)
                WHERE elementId(sale) IN $sale_ids

                MATCH (product)-[:소속제품분류]->(source:제품분류)

                MATCH (source)-[r:상위분류]->(target:분류)

                RETURN DISTINCT source, r, target
            """, sale_ids=sale_ids)

            append_graph_records(
                category_result,
                nodes,
                links,
            )

        # ----------------------------------------------------
        # STEP 8. React 응답 반환
        # ----------------------------------------------------

        return {
            "customers": customers,
            "selected_customer": customer_code,
            "nodes": list(nodes.values()),
            "links": list(links.values()),
        }
