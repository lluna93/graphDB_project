
import { useQuery } from "@tanstack/react-query";
import { getCommunities } from "../api/communityApi";

export function useCommunities(
    minSimilarity,
    topProducts = 5
) {
    return useQuery({
        queryKey: [
            "customer-communities",
            minSimilarity,
            topProducts,
        ],
        queryFn: () =>
            getCommunities(minSimilarity, topProducts),
        staleTime: 5 * 60 * 1000,
    });
}
