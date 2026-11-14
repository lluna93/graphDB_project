
import axios from "axios";

export async function getCommunities(
    minSimilarity = 0.2,
    topProducts = 5
) {
    const response = await axios.get(
        "/api/marketing/communities/insights",
        {
            params: {
                min_similarity: minSimilarity,
                top_products: topProducts,
                target_limit: 30,
            },
            timeout: 120000,
        }
    );

    return response.data;
}
