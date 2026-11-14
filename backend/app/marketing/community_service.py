
from collections import Counter, defaultdict
from itertools import combinations

import igraph as ig
import leidenalg

from app.database import get_driver, DATABASE


def load_customer_products():
    """
    Neo4j에서 고객별 구매 제품을 조회한다.

    고객 -> 판매 -> 제품

    동일 제품을 여러 번 구매했어도
    고객별 제품 집합에서는 한 번만 계산한다.
    """

    query = """
    MATCH (c:고객)
    WHERE c.고객코드 IS NOT NULL

    OPTIONAL MATCH
        (c)-[:구매]->(:판매)-[:판매제품]->(p:제품)

    RETURN
        toString(c.고객코드) AS customer_code,
        coalesce(
            toString(c.고객명),
            toString(c.고객코드)
        ) AS customer_name,
        collect(DISTINCT
            CASE
                WHEN p IS NOT NULL THEN {
                    code: coalesce(
                        toString(p.제품코드),
                        elementId(p)
                    ),
                    name: coalesce(
                        toString(p.제품명),
                        toString(p.제품코드),
                        '이름 없음'
                    )
                }
                ELSE null
            END
        ) AS products
    ORDER BY customer_code
    """

    customers = []
    product_names = {}

    with get_driver().session(database=DATABASE) as session:
        for row in session.run(query):
            product_codes = set()

            for product in row["products"]:
                if product is None:
                    continue

                code = product["code"]
                product_codes.add(code)
                product_names[code] = product["name"]

            customers.append({
                "code": row["customer_code"],
                "name": row["customer_name"],
                "products": product_codes,
            })

    return customers, product_names


def calculate_similarity_edges(customers, min_similarity):
    """
    고객별 구매 제품 집합으로 Jaccard 유사도를 계산한다.

    Jaccard(A,B) =
        공통 구매 제품 수 / 전체 고유 구매 제품 수

    공통 제품이 없는 고객 쌍은 비교하지 않는다.
    """

    # 제품별 구매 고객 인덱스
    product_to_customers = defaultdict(list)

    for idx, customer in enumerate(customers):
        for product_code in customer["products"]:
            product_to_customers[product_code].append(idx)

    # 공통 제품을 가진 고객 쌍의 교집합 크기
    common_counts = Counter()

    for customer_indices in product_to_customers.values():
        for a, b in combinations(customer_indices, 2):
            common_counts[(a, b)] += 1

    edges = []

    for (a, b), common_count in common_counts.items():
        products_a = customers[a]["products"]
        products_b = customers[b]["products"]

        union_count = (
            len(products_a)
            + len(products_b)
            - common_count
        )

        if union_count == 0:
            continue

        similarity = common_count / union_count

        if similarity >= min_similarity:
            edges.append({
                "source_index": a,
                "target_index": b,
                "similarity": similarity,
                "common_products": common_count,
            })

    return edges


def detect_communities(customers, edges):
    """
    Leiden 알고리즘으로 고객 커뮤니티 탐지.

    고객은 그래프 정점(vertex),
    Jaccard 유사도는 간선 가중치(weight)로 사용한다.

    고립 고객도 정점으로 포함한다.
    """

    graph = ig.Graph(
        n=len(customers),
        directed=False
    )

    if edges:
        graph.add_edges([
            (edge["source_index"], edge["target_index"])
            for edge in edges
        ])

        weights = [
            edge["similarity"]
            for edge in edges
        ]
    else:
        weights = []

    if not customers:
        return [], graph

    partition = leidenalg.find_partition(
        graph,
        leidenalg.RBConfigurationVertexPartition,
        weights=weights if edges else None,
        resolution_parameter=1.0,
        seed=42,
    )

    return list(partition.membership), graph


def analyze_communities(
    customers,
    membership,
    product_names,
    top_products
):
    """
    커뮤니티별 고객 수와 대표 제품 분석.

    대표 제품은 해당 커뮤니티에서
    구매한 고유 고객 수가 많은 순서로 정한다.
    """

    groups = defaultdict(list)

    for idx, community_id in enumerate(membership):
        groups[community_id].append(customers[idx])

    summaries = []

    for community_id, members in groups.items():
        product_counts = Counter()

        for customer in members:
            product_counts.update(customer["products"])

        top_items = [
            {
                "code": code,
                "name": product_names.get(code, code),
                "customer_count": count,
                "penetration": round(
                    count / len(members), 4
                ),
            }
            for code, count in product_counts.most_common(
                top_products
            )
        ]

        if top_items:
            segment_name = (
                f"{top_items[0]['name']} 중심 그룹"
            )
        else:
            segment_name = "구매 이력 없음"

        summaries.append({
            "community_id": community_id,
            "segment_name": segment_name,
            "customer_count": len(members),
            "top_products": top_items,
        })

    # 큰 커뮤니티부터 정렬
    summaries.sort(
        key=lambda item: item["customer_count"],
        reverse=True
    )

    return summaries


def get_customer_communities(
    min_similarity=0.2,
    top_products=5,
):
    customers, product_names = load_customer_products()

    if not customers:
        return {
            "total_customers": 0,
            "community_count": 0,
            "connected_customers": 0,
            "isolated_customers": 0,
            "edge_count": 0,
            "communities": [],
            "nodes": [],
            "links": [],
        }

    edges = calculate_similarity_edges(
        customers,
        min_similarity
    )

    membership, graph = detect_communities(
        customers,
        edges
    )

    communities = analyze_communities(
        customers,
        membership,
        product_names,
        top_products
    )

    # 화면에서 사용하기 쉬운 커뮤니티 번호 부여
    # 커뮤니티 크기 순서대로 1, 2, 3...
    id_mapping = {
        item["community_id"]: index + 1
        for index, item in enumerate(communities)
    }

    for item in communities:
        item["community_id"] = id_mapping[
            item["community_id"]
        ]

    nodes = []

    for idx, customer in enumerate(customers):
        community_id = id_mapping[membership[idx]]

        nodes.append({
            "id": f"고객:{customer['code']}",
            "label": "고객",
            "name": customer["name"],
            "community_id": community_id,
            "product_count": len(customer["products"]),
            "degree": graph.degree(idx),
        })

    links = []

    for edge in edges:
        source = customers[edge["source_index"]]
        target = customers[edge["target_index"]]

        links.append({
            "source": f"고객:{source['code']}",
            "target": f"고객:{target['code']}",
            "type": "구매유사",
            "weight": round(edge["similarity"], 4),
            "common_products": edge["common_products"],
        })

    # 연결이 없는 고객 수
    isolated_customers = sum(
        degree == 0
        for degree in graph.degree()
    )

    return {
        "total_customers": len(customers),
        "community_count": len(communities),
        "connected_customers": (
            len(customers) - isolated_customers
        ),
        "isolated_customers": isolated_customers,
        "edge_count": len(links),
        "communities": communities,
        "nodes": nodes,
        "links": links,
    }
