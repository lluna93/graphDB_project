
import axios from "axios";

const api = axios.create({
    baseURL: "/api",
    timeout: 30000,
});

export async function getCustomerGraph(customerCode, limit = 50) {
    const params = { limit };

    if (customerCode !== null && customerCode !== undefined && customerCode !== "") {
        params.customer_code = customerCode;
    }

    const response = await api.get("/customers/graph", {
        params,
    });

    return response.data;
}
