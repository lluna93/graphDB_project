
import { useQuery } from "@tanstack/react-query";
import { getCustomerRecommendations } from "../api/recommendationApi";

export function useCustomerRecommendations(
    customerCode,
    minSimilarity
) {
    return useQuery({
        queryKey: [
            "customer-recommendations",
            customerCode,
            minSimilarity,
        ],
        queryFn: () =>
            getCustomerRecommendations(
                customerCode,
                minSimilarity
            ),
        enabled: Boolean(customerCode),
        staleTime: 5 * 60 * 1000,
    });
}
