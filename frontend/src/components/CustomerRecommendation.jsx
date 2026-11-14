
import {
    Alert,
    Card,
    Col,
    Empty,
    Row,
    Spin,
    Table,
    Tag,
    Typography,
} from "antd";

import { useCustomerRecommendations } from "../query/useCustomerRecommendations";
import RecommendationGraph from "./RecommendationGraph";

const { Text, Title } = Typography;

export default function CustomerRecommendation({
                                                   customerCode,
                                                   minSimilarity = 0.2,
                                               }) {
    const { data, isLoading, error } =
        useCustomerRecommendations(
            customerCode,
            minSimilarity
        );

    if (!customerCode) {
        return (
            <Card title="고객별 맞춤 추천 TOP 3">
                <Empty description="고객을 선택해 주세요." />
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card title="고객별 맞춤 추천 TOP 3">
                <Spin tip="추천 제품 계산 중">
                    <div style={{ height: 160 }} />
                </Spin>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert
                type="error"
                showIcon
                message="추천 분석 실패"
                description={error.message}
            />
        );
    }

    if (!data) return null;

    const columns = [
        {
            title: "순위",
            render: (_, __, index) => (
                <Tag color={index === 0 ? "purple" : "blue"}>
                    TOP {index + 1}
                </Tag>
            ),
        },
        {
            title: "추천 제품",
            dataIndex: "product_name",
        },
        {
            title: "추천 점수",
            dataIndex: "score",
            render: (v) => <Text strong>{v.toFixed(1)}점</Text>,
        },
        {
            title: "추천 근거",
            dataIndex: "reason",
        },
    ];

    return (
        <Card
            title={`${data.customer.name} 고객 맞춤 추천 TOP 3`}
        >
            <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                    <Card size="small">
                        <Text type="secondary">소속 커뮤니티</Text>
                        <Title level={4}>
                            그룹 {data.customer.community_id}
                        </Title>
                    </Card>
                </Col>

                <Col xs={24} md={8}>
                    <Card size="small">
                        <Text type="secondary">구매 제품 수</Text>
                        <Title level={4}>
                            {data.customer.purchased_product_count}개
                        </Title>
                    </Card>
                </Col>

                <Col xs={24} md={8}>
                    <Card size="small">
                        <Text type="secondary">유사 고객 수</Text>
                        <Title level={4}>
                            {data.customer.similar_customer_count}명
                        </Title>
                    </Card>
                </Col>
            </Row>

            {data.recommendations.length ? (
                <>
                    <div style={{ marginTop: 20 }}>
                        <RecommendationGraph graph={data.graph} />
                    </div>

                    <Table
                        style={{ marginTop: 20 }}
                        rowKey="product_code"
                        columns={columns}
                        dataSource={data.recommendations}
                        pagination={false}
                        scroll={{ x: 700 }}
                    />
                </>
            ) : (
                <Empty
                    style={{ marginTop: 24 }}
                    description="추천 가능한 미구매 제품이 없습니다."
                />
            )}
        </Card>
    );
}
