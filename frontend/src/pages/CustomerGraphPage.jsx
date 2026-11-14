
import { useMemo, useState } from "react";
import {
    Alert,
    Card,
    Col,
    Row,
    Select,
    Slider,
    Space,
    Spin,
    Statistic,
    Tag,
    Typography,
} from "antd";
import styled from "styled-components";

import { useCustomerGraph } from "../query/useCustomerGraph";
import CustomerNetwork from "../components/CustomerNetwork";

const { Title, Text } = Typography;

const Page = styled.main`
  min-height: 100vh;
  padding: 32px;
  background: #f5f7fb;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const COLORS = {
    고객: "blue",
    지역: "green",
    판매: "gold",
    제품: "purple",
    제품분류: "magenta",
    분류: "cyan",
    채널: "volcano",
    프로모션: "geekblue",
};

export default function CustomerGraphPage() {
    const [customerCode, setCustomerCode] = useState(null);
    const [limit, setLimit] = useState(50);

    const { data, isLoading, isFetching, error } = useCustomerGraph(
        customerCode,
        limit
    );

    const customers = data?.customers || [];
    const nodes = data?.nodes || [];
    const links = data?.links || [];

    const customerOptions = useMemo(
        () =>
            customers.map((customer) => ({
                value: String(customer.code),
                label: `${customer.name} (${customer.code})`,
            })),
        [customers]
    );

    const counts = useMemo(() => {
        const result = {};

        nodes.forEach((node) => {
            result[node.label] = (result[node.label] || 0) + 1;
        });

        return result;
    }, [nodes]);

    return (
        <Page>
            <Header>
                <Title level={2} style={{ marginBottom: 4 }}>
                    고객 관계 네트워크 분석
                </Title>

                <Text type="secondary">
                    Neo4j Graph Database 기반 고객 · 판매 · 제품 관계 시각화
                </Text>
            </Header>

            <Card style={{ marginBottom: 20 }}>
                <Row gutter={[24, 16]} align="middle">
                    <Col xs={24} md={14}>
                        <Text strong>고객 검색</Text>

                        <Select
                            showSearch
                            allowClear
                            placeholder="고객명 또는 고객코드 검색"
                            style={{ width: "100%", marginTop: 8 }}
                            value={
                                customerCode === null ? undefined : String(customerCode)
                            }
                            options={customerOptions}
                            optionFilterProp="label"
                            onChange={(value) =>
                                setCustomerCode(value ?? null)
                            }
                        />
                    </Col>

                    <Col xs={24} md={10}>
                        <Text strong>조회할 판매 건수: {limit}건</Text>

                        <Slider
                            min={10}
                            max={200}
                            step={10}
                            value={limit}
                            onChangeComplete={setLimit}
                            marks={{
                                10: "10",
                                100: "100",
                                200: "200",
                            }}
                        />
                    </Col>
                </Row>
            </Card>

            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="API 조회 실패"
                    description={error.message}
                    style={{ marginBottom: 20 }}
                />
            )}

            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="전체 고객 수"
                            value={customers.length}
                            loading={isLoading}
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="조회된 노드 수"
                            value={nodes.length}
                            loading={isLoading}
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="연결 관계 수"
                            value={links.length}
                            loading={isLoading}
                        />
                    </Card>
                </Col>
            </Row>

            <Card
                title="고객 관계 그래프"
                extra={isFetching ? <Spin size="small" /> : null}
            >
                <Space wrap style={{ marginBottom: 20 }}>
                    {Object.entries(COLORS).map(([label, color]) => (
                        <Tag key={label} color={color}>
                            {label} {counts[label] || 0}
                        </Tag>
                    ))}
                </Space>

                <CustomerNetwork nodes={nodes} links={links} />
            </Card>
        </Page>
    );
}
