
import { useQuery } from "@tanstack/react-query";
import { getCustomerGraph } from "../api/customerApi";

export function useCustomerGraph(customerCode, limit = 50) {
    return useQuery({
        queryKey: ["customerGraph", customerCode, limit],
        queryFn: () => getCustomerGraph(customerCode, limit),
        staleTime: 60 * 1000,
        retry: 1,
    });
}
