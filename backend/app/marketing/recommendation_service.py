
from collections import Counter, defaultdict

from app.marketing.community_service import (
    load_customer_products,
    calculate_similarity_edges,
    detect_communities,
)


def get_customer_recommendations(
    customer_code: str,
    min_similarity: float = 0.2,
    top_k: int = 3,
):
    customers, product_names = load_customer_products()

    if not customers:
        return None

    index_by_code = {
        customer["code"]: idx
        for idx, customer in enumerate(customers)
    }

    selected_idx = index_by_code.get(str(customer_code))

    if selected_idx is None:
        return None

    # 1. 기존 Leiden 알고리즘으로 커뮤니티 탐지
    edges = calculate_similarity_edges(
        customers, min_similarity
    )
    membership, _ = detect_communities(
        customers, edges
    )

    customer = customers[selected_idx]
    community_id = membership[selected_idx]

    members = [
        c for idx, c in enumerate(customers)
        if membership[idx] == community_id
    ]

    purchased = customer["products"]

    # 2. 커뮤니티별 제품 구매 고객 수
    community_counts = Counter()
    global_counts = Counter()

    for member in members:
        community_counts.update(member["products"])

    for c in customers:
        global_counts.update(c["products"])

    # 3. 선택 고객과 직접 연결된 유사 고객
    neighbors = []

    for edge in edges:
        a = edge["source_index"]
        b = edge["target_index"]

        if a == selected_idx:
            other_idx = b
        elif b == selected_idx:
            other_idx = a
        else:
            continue

        # 같은 커뮤니티에 속한 고객만 사용
        if membership[other_idx] != community_id:
            continue

        neighbors.append({
            "customer": customers[other_idx],
            "similarity": edge["similarity"],
        })

    # 4. 유사 고객의 가중 구매 비율
    similarity_sum = sum(
        n["similarity"] for n in neighbors
    )

    neighbor_scores = defaultdict(float)
    neighbor_counts = Counter()

    for neighbor in neighbors:
        for code in neighbor["customer"]["products"]:
            neighbor_scores[code] += neighbor["similarity"]
            neighbor_counts[code] += 1

    recommendations = []

    for code, count in community_counts.items():
        # 이미 구매한 제품은 제외
        if code in purchased:
            continue

        community_rate = count / len(members)

        global_rate = (
            global_counts[code] / len(customers)
        )

        lift = (
            community_rate / global_rate
            if global_rate > 0 else 0
        )

        # 0~1 범위로 정규화
        similarity_score = (
            neighbor_scores[code] / similarity_sum
            if similarity_sum > 0 else 0
        )

        # Lift 3배 이상은 만점으로 처리
        lift_score = min(lift / 3.0, 1.0)

        score = (
            0.5 * similarity_score
            + 0.3 * community_rate
            + 0.2 * lift_score
        )

        reasons = []

        if neighbor_counts[code]:
            reasons.append(
                f"유사 고객 {neighbor_counts[code]}명 구매"
            )

        reasons.append(
            f"커뮤니티 구매율 {community_rate * 100:.1f}%"
        )
        reasons.append(f"구매 집중도 {lift:.2f}배")

        recommendations.append({
            "product_code": code,
            "product_name": product_names.get(code, code),
            "score": round(score * 100, 2),
            "similar_customer_score": round(
                similarity_score, 4
            ),
            "community_rate": round(
                community_rate, 4
            ),
            "lift": round(lift, 4),
            "similar_customer_count": neighbor_counts[code],
            "reason": " / ".join(reasons),
        })

    recommendations.sort(
        key=lambda item: (
            -item["score"],
            -item["similar_customer_count"],
            item["product_code"],
        )
    )

    top_recommendations = recommendations[:top_k]

    # 5. 프론트엔드 관계 그래프 데이터
    customer_node_id = f"고객:{customer['code']}"

    nodes = [{
        "id": customer_node_id,
        "name": customer["name"],
        "type": "customer",
        "community_id": community_id,
    }]

    links = []

    for rank, item in enumerate(
        top_recommendations, start=1
    ):
        product_node_id = (
            f"추천제품:{item['product_code']}"
        )

        nodes.append({
            "id": product_node_id,
            "name": item["product_name"],
            "type": "product",
            "rank": rank,
            "score": item["score"],
        })

        links.append({
            "source": customer_node_id,
            "target": product_node_id,
            "type": "추천",
            "weight": item["score"],
            "rank": rank,
        })

    return {
        "customer": {
            "code": customer["code"],
            "name": customer["name"],
            "community_id": community_id,
            "purchased_product_count": len(purchased),
            "similar_customer_count": len(neighbors),
        },
        "recommendations": top_recommendations,
        "graph": {
            "nodes": nodes,
            "links": links,
        },
    }
