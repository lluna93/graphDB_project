
from collections import Counter, defaultdict

from app.marketing.community_service import (
    get_customer_communities,
    load_customer_products,
)


def get_community_insights(
    min_similarity: float = 0.2,
    top_products: int = 5,
    target_limit: int = 30,
):
    # 1. 기존 Leiden 커뮤니티 분석
    result = get_customer_communities(
        min_similarity=min_similarity,
        top_products=top_products,
    )

    # 2. 고객별 구매 제품 집합
    customers, product_names = load_customer_products()

    customer_by_code = {
        c["code"]: c for c in customers
    }

    # Leiden 분석 결과의 고객별 커뮤니티
    groups = defaultdict(list)

    for node in result["nodes"]:
        code = node["id"].split(":", 1)[1]
        customer = customer_by_code.get(code)

        if customer:
            groups[node["community_id"]].append(customer)

    total_customers = len(customers)

    # 3. 전체 고객의 제품별 구매 고객 수
    global_counts = Counter()

    for customer in customers:
        global_counts.update(customer["products"])

    # 4. 커뮤니티별 특화 제품 분석
    for community in result["communities"]:
        cid = community["community_id"]
        members = groups[cid]
        member_count = len(members)

        local_counts = Counter()

        for customer in members:
            local_counts.update(customer["products"])

        product_insights = []

        for code, local_count in local_counts.items():
            global_count = global_counts[code]

            local_rate = (
                local_count / member_count
                if member_count else 0
            )

            global_rate = (
                global_count / total_customers
                if total_customers else 0
            )

            lift = (
                local_rate / global_rate
                if global_rate else 0
            )

            product_insights.append({
                "code": code,
                "name": product_names.get(code, code),
                "customer_count": local_count,
                "community_rate": round(local_rate, 4),
                "global_rate": round(global_rate, 4),
                "lift": round(lift, 4),
            })

        # 표본이 너무 적은 제품의 과대평가를 줄이기 위해
        # 커뮤니티 내 최소 3명 이상 구매한 제품만 비교
        distinctive = sorted(
            [
                p for p in product_insights
                if p["customer_count"] >= 3
            ],
            key=lambda p: (
                -p["lift"],
                -p["customer_count"],
                p["code"],
            ),
        )

        community["distinctive_products"] = (
            distinctive[:top_products]
        )

        # 기존 자동 그룹명보다 특화 제품 중심으로 변경
        if distinctive:
            community["segment_name"] = (
                f"{distinctive[0]['name']} 특화 그룹"
            )

        # 5. 교차 판매 대상 추출
        # Lift > 1인 제품 중 아직 구매하지 않은 고객
        targets = []

        for product in distinctive:
            if product["lift"] <= 1:
                continue

            for customer in members:
                if product["code"] in customer["products"]:
                    continue

                targets.append({
                    "customer_code": customer["code"],
                    "customer_name": customer["name"],
                    "product_code": product["code"],
                    "product_name": product["name"],
                    "lift": product["lift"],
                    "community_rate": product["community_rate"],
                    "reason": (
                        f"커뮤니티 구매율 "
                        f"{product['community_rate'] * 100:.1f}%, "
                        f"Lift {product['lift']:.2f}"
                    ),
                })

        # Lift 우선, 커뮤니티 구매율 차순
        targets.sort(
            key=lambda t: (
                -t["lift"],
                -t["community_rate"],
                t["customer_code"],
                t["product_code"],
            )
        )

        community["cross_sell_total"] = len(targets)
        community["cross_sell_targets"] = (
            targets[:target_limit]
        )

    # 6. 커뮤니티 간 연결을 축약
    # 같은 그룹 내부 관계와 그룹 사이 관계를 집계
    pair_counts = Counter()
    internal_counts = Counter()

    node_to_community = {
        node["id"]: node["community_id"]
        for node in result["nodes"]
    }

    for link in result["links"]:
        a = node_to_community[link["source"]]
        b = node_to_community[link["target"]]

        if a == b:
            internal_counts[a] += 1
        else:
            pair = tuple(sorted((a, b)))
            pair_counts[pair] += 1

    result["community_graph"] = {
        "nodes": [
            {
                "id": str(c["community_id"]),
                "community_id": c["community_id"],
                "name": c["segment_name"],
                "customer_count": c["customer_count"],
                "internal_edges": internal_counts[
                    c["community_id"]
                ],
            }
            for c in result["communities"]
        ],
        "links": [
            {
                "source": str(a),
                "target": str(b),
                "weight": count,
            }
            for (a, b), count in pair_counts.items()
        ],
    }

    return result
