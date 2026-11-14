
import { useState } from "react";
import { Layout, Menu } from "antd";

import {
    UserOutlined,
    ClusterOutlined,
} from "@ant-design/icons";

import CustomerGraphPage from "./pages/CustomerGraphPage";
import CommunityPage from "./pages/CommunityPage";

const { Header, Content } = Layout;

export default function App() {
    const [page, setPage] = useState("communities");

    const items = [
        {
            key: "customer",
            icon: <UserOutlined />,
            label: "고객 관계 분석",
        },
        {
            key: "communities",
            icon: <ClusterOutlined />,
            label: "고객 커뮤니티 분석",
        },
    ];

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Header
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    background: "#fff",
                    borderBottom: "1px solid #eee",
                }}
            >
                <strong style={{ whiteSpace: "nowrap" }}>
                    Neo4j Marketing Analytics
                </strong>

                <Menu
                    mode="horizontal"
                    selectedKeys={[page]}
                    items={items}
                    onClick={({ key }) => setPage(key)}
                    style={{ flex: 1, minWidth: 0 }}
                />
            </Header>

            <Content>
                {page === "customer" && <CustomerGraphPage />}
                {page === "communities" && <CommunityPage />}
            </Content>
        </Layout>
    );
}
