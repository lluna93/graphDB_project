
import axios from "axios";

export async function getCustomerRecommendations(
    customerCode,
    minSimilarity = 0.2
) {
    const response = await axios.get(
        `/api/marketing/customers/${encodeURIComponent(customerCode)}/recommendations`,
        {
            params: {
                min_similarity: minSimilarity,
                top_k: 3,
            },
        }
    );

    return response.data;
}
