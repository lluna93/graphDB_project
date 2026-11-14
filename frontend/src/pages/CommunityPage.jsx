
import { useMemo, useState } from "react";

import {
    Alert,
    Button,
    Card,
    Col,
    Empty,
    Row,
    Select,
    Slider,
    Space,
    Spin,
    Statistic,
    Table,
    Tag,
    Typography,
} from "antd";

import { useCommunities } from "../query/useCommunities";

import CommunityNetwork, {
    communityColor,
} from "../components/CommunityNetwork";

import CustomerRecommendation from "../components/CustomerRecommendation";

const { Title, Text } = Typography;


// ==================================================
// 공통 함수
// ==================================================

function percent(value = 0) {
    return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatNumber(value = 0) {
    return Number(value).toLocaleString("ko-KR");
}

function getCustomerCode(nodeId) {
    return String(nodeId).split(":").slice(1).join(":");
}


// ==================================================
// 커뮤니티 특성 요약 카드
// ==================================================

function CommunitySummaryCards({
                                   communities,
                                   selectedCommunity,
                                   onSelect,
                               }) {
    // 고객 2명 이상인 커뮤니티
    const groups = useMemo(
        () =>
            communities
                .filter((c) => c.customer_count > 1)
                .sort(
                    (a, b) =>
                        b.customer_count - a.customer_count
                ),
        [communities]
    );

    // 고객 1명인 커뮤니티
    const singleGroups = communities.filter(
        (c) => c.customer_count === 1
    );

    return (
        <Card
            title="커뮤니티별 고객 특성"
            style={{ marginBottom: 20 }}
            extra={
                <Text type="secondary">
                    카드 클릭 시 상세 분석
                </Text>
            }
        >
            {groups.length === 0 ? (
                <Empty description="분석 가능한 커뮤니티가 없습니다." />
            ) : (
                <Row gutter={[16, 16]}>
                    {groups.map((community) => {
                        const products =
                            community.distinctive_products || [];

                        const topProduct = products[0];

                        const isSelected =
                            selectedCommunity ===
                            community.community_id;

                        const color = communityColor(
                            community.community_id
                        );

                        return (
                            <Col
                                key={community.community_id}
                                xs={24}
                                md={12}
                                xl={8}
                            >
                                <Card
                                    hoverable
                                    onClick={() =>
                                        onSelect(community.community_id)
                                    }
                                    style={{
                                        height: "100%",
                                        borderColor: isSelected
                                            ? color
                                            : "#e5e7eb",
                                        borderWidth: isSelected ? 2 : 1,
                                    }}
                                >
                                    <Space
                                        style={{
                                            width: "100%",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <Tag color={color}>
                                            그룹 {community.community_id}
                                        </Tag>

                                        <Text strong>
                                            {formatNumber(
                                                community.customer_count
                                            )}
                                            명
                                        </Text>
                                    </Space>

                                    <Title
                                        level={5}
                                        style={{ marginTop: 14 }}
                                    >
                                        {community.segment_name}
                                    </Title>

                                    <Text type="secondary">
                                        전체 고객과 비교했을 때
                                        다음 제품들의 구매 비율이
                                        상대적으로 높은 고객군입니다.
                                    </Text>

                                    <div style={{ marginTop: 14 }}>
                                        <Text strong>
                                            주요 특화 제품
                                        </Text>

                                        <div style={{ marginTop: 8 }}>
                                            <Space wrap>
                                                {products
                                                    .slice(0, 3)
                                                    .map((product) => (
                                                        <Tag key={product.code}>
                                                            {product.name}
                                                        </Tag>
                                                    ))}
                                            </Space>
                                        </div>
                                    </div>

                                    <Row
                                        gutter={16}
                                        style={{ marginTop: 18 }}
                                    >
                                        <Col span={12}>
                                            <Statistic
                                                title="최고 구매 집중도"
                                                value={topProduct?.lift || 0}
                                                precision={2}
                                                suffix="배"
                                            />
                                        </Col>

                                        <Col span={12}>
                                            <Statistic
                                                title="교차 판매 후보"
                                                value={
                                                    community.cross_sell_total || 0
                                                }
                                                suffix="건"
                                            />
                                        </Col>
                                    </Row>

                                    <Button
                                        type={
                                            isSelected
                                                ? "primary"
                                                : "default"
                                        }
                                        block
                                        style={{ marginTop: 18 }}
                                    >
                                        {isSelected
                                            ? "선택된 커뮤니티"
                                            : "상세 분석 보기"}
                                    </Button>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}

            {singleGroups.length > 0 && (
                <Alert
                    style={{ marginTop: 20 }}
                    type="info"
                    showIcon
                    message={
                        `1인 커뮤니티 ${singleGroups.length}개`
                    }
                    description={
                        "다른 고객과 충분한 구매 유사도가 " +
                        "형성되지 않은 고객은 별도로 집계했습니다."
                    }
                />
            )}
        </Card>
    );
}


// ==================================================
// 메인 페이지
// ==================================================

export default function CommunityPage() {
    // 고객 유사도 임계값
    const [similarity, setSimilarity] =
        useState(0.2);

    // 선택된 커뮤니티
    const [
        selectedCommunity,
        setSelectedCommunity,
    ] = useState(null);

    // 추천 대상 고객
    const [
        selectedCustomer,
        setSelectedCustomer,
    ] = useState(null);

    // API 호출
    const {
        data,
        isLoading,
        isFetching,
        error,
    } = useCommunities(similarity, 5);

    const communities = data?.communities || [];

    // 현재 선택된 커뮤니티
    const selected = communities.find(
        (community) =>
            community.community_id ===
            selectedCommunity
    );

    // 특화 제품
    const products =
        selected?.distinctive_products || [];

    // 교차 판매 대상 고객
    const targets =
        selected?.cross_sell_targets || [];

    // 고객 선택 목록
    const availableCustomers = useMemo(() => {
        if (!data?.nodes) return [];

        return data.nodes
            .filter(
                (node) =>
                    selectedCommunity == null ||
                    node.community_id ===
                    selectedCommunity
            )
            .map((node) => {
                const code = getCustomerCode(node.id);

                return {
                    value: code,
                    label: `${node.name} (${code})`,
                };
            })
            .sort((a, b) =>
                a.label.localeCompare(
                    b.label,
                    "ko"
                )
            );
    }, [data, selectedCommunity]);


    // ==================================================
    // 커뮤니티 선택 처리
    // ==================================================

    function handleCommunitySelect(communityId) {
        setSelectedCommunity(
            communityId ?? null
        );

        // 커뮤니티가 바뀌면 고객 선택 초기화
        setSelectedCustomer(null);
    }


    // ==================================================
    // 커뮤니티 목록 테이블
    // ==================================================

    const communityColumns = [
        {
            title: "커뮤니티",
            dataIndex: "community_id",
            key: "community_id",
            render: (id) => (
                <Tag color={communityColor(id)}>
                    그룹 {id}
                </Tag>
            ),
        },
        {
            title: "고객 수",
            dataIndex: "customer_count",
            key: "customer_count",
            sorter: (a, b) =>
                a.customer_count - b.customer_count,
            render: (value) =>
                `${formatNumber(value)}명`,
        },
        {
            title: "자동 그룹명",
            dataIndex: "segment_name",
            key: "segment_name",
        },
        {
            title: "대표 특화 제품",
            key: "top_product",
            render: (_, row) =>
                row.distinctive_products?.[0]?.name ||
                "-",
        },
        {
            title: "교차 판매 후보",
            dataIndex: "cross_sell_total",
            key: "cross_sell_total",
            render: (value) =>
                `${formatNumber(value)}건`,
        },
        {
            title: "상세 분석",
            key: "action",
            render: (_, row) => (
                <Button
                    type="link"
                    onClick={() =>
                        handleCommunitySelect(
                            row.community_id
                        )
                    }
                >
                    분석 보기
                </Button>
            ),
        },
    ];


    // ==================================================
    // 특화 제품 테이블
    // ==================================================

    const productColumns = [
        {
            title: "제품명",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "구매 고객 수",
            dataIndex: "customer_count",
            key: "customer_count",
            render: (value) =>
                `${formatNumber(value)}명`,
        },
        {
            title: "그룹 구매율",
            dataIndex: "community_rate",
            key: "community_rate",
            render: percent,
        },
        {
            title: "전체 구매율",
            dataIndex: "global_rate",
            key: "global_rate",
            render: percent,
        },
        {
            title: "Lift",
            dataIndex: "lift",
            key: "lift",
            sorter: (a, b) =>
                a.lift - b.lift,
            render: (value) => (
                <Tag
                    color={
                        value > 1 ? "purple" : "default"
                    }
                >
                    {Number(value).toFixed(2)}배
                </Tag>
            ),
        },
    ];


    // ==================================================
    // 교차 판매 대상 고객 테이블
    // ==================================================

    const targetColumns = [
        {
            title: "고객 코드",
            dataIndex: "customer_code",
            key: "customer_code",
        },
        {
            title: "고객명",
            dataIndex: "customer_name",
            key: "customer_name",
        },
        {
            title: "추천 후보 제품",
            dataIndex: "product_name",
            key: "product_name",
        },
        {
            title: "Lift",
            dataIndex: "lift",
            key: "lift",
            render: (value) =>
                `${Number(value).toFixed(2)}배`,
        },
        {
            title: "추천 근거",
            dataIndex: "reason",
            key: "reason",
        },
    ];


    // ==================================================
    // 화면
    // ==================================================

    return (
        <main
            style={{
                padding: 24,
                background: "#f5f7fb",
                minHeight: "100vh",
            }}
        >
            {/* 제목 */}
            <Title level={2}>
                고객 커뮤니티 마케팅 분석
            </Title>

            <Text type="secondary">
                Neo4j 구매 관계 · Leiden 커뮤니티 탐지 ·
                구매 집중도 · 교차 판매 · 개인화 추천
            </Text>


            {/* 분석 조건 */}
            <Card
                style={{
                    marginTop: 20,
                    marginBottom: 20,
                }}
            >
                <Row gutter={24} align="middle">
                    <Col xs={24} md={12}>
                        <Text strong>
                            최소 고객 유사도:{" "}
                            {similarity.toFixed(2)}
                        </Text>

                        <Slider
                            min={0.05}
                            max={0.8}
                            step={0.05}
                            value={similarity}
                            onChangeComplete={(value) => {
                                setSimilarity(value);

                                handleCommunitySelect(null);
                            }}
                        />
                    </Col>

                    <Col xs={24} md={12}>
                        <Text strong>
                            커뮤니티 선택
                        </Text>

                        <Select
                            allowClear
                            placeholder="전체 커뮤니티"
                            style={{
                                display: "block",
                                width: "100%",
                                marginTop: 8,
                            }}
                            value={selectedCommunity}
                            onChange={
                                handleCommunitySelect
                            }
                            options={communities.map(
                                (community) => ({
                                    value:
                                    community.community_id,
                                    label:
                                        `그룹 ${community.community_id} ` +
                                        `(${community.customer_count}명)`,
                                })
                            )}
                        />
                    </Col>
                </Row>
            </Card>


            {/* API 오류 */}
            {error && (
                <Alert
                    type="error"
                    showIcon
                    message="커뮤니티 분석 실패"
                    description={error.message}
                    style={{ marginBottom: 20 }}
                />
            )}


            {/* 로딩 */}
            {isLoading ? (
                <Card>
                    <Spin tip="고객 구매 관계 분석 중">
                        <div style={{ height: 200 }} />
                    </Spin>
                </Card>
            ) : data ? (
                <>
                    {/* KPI */}
                    <Row
                        gutter={[16, 16]}
                        style={{ marginBottom: 20 }}
                    >
                        <Col xs={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="전체 고객"
                                    value={data.total_customers}
                                    suffix="명"
                                />
                            </Card>
                        </Col>

                        <Col xs={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="탐지 커뮤니티"
                                    value={data.community_count}
                                    suffix="개"
                                />
                            </Card>
                        </Col>

                        <Col xs={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="유사 고객 관계"
                                    value={data.edge_count}
                                    suffix="개"
                                />
                            </Card>
                        </Col>

                        <Col xs={12} lg={6}>
                            <Card>
                                <Statistic
                                    title="고립 고객"
                                    value={data.isolated_customers}
                                    suffix="명"
                                />
                            </Card>
                        </Col>
                    </Row>


                    {/* 커뮤니티 특성 요약 */}
                    <CommunitySummaryCards
                        communities={communities}
                        selectedCommunity={
                            selectedCommunity
                        }
                        onSelect={
                            handleCommunitySelect
                        }
                    />


                    {/* 커뮤니티 네트워크 */}
                    <Card
                        title={
                            selected
                                ? `그룹 ${selected.community_id} 고객 관계`
                                : "전체 고객 커뮤니티 네트워크"
                        }
                        extra={
                            <Space>
                                {isFetching && (
                                    <Spin size="small" />
                                )}

                                {selected && (
                                    <Button
                                        onClick={() =>
                                            handleCommunitySelect(null)
                                        }
                                    >
                                        전체 보기
                                    </Button>
                                )}
                            </Space>
                        }
                        style={{ marginBottom: 20 }}
                    >
                        <Alert
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                            message={
                                selected
                                    ? "고객 간 구매 유사도 관계입니다. " +
                                    "연결 수 상위 최대 80명을 표시합니다."
                                    : "원 하나가 고객 커뮤니티입니다. " +
                                    "클릭하면 고객 관계를 확인할 수 있습니다."
                            }
                        />

                        <CommunityNetwork
                            data={data}
                            selectedCommunity={
                                selectedCommunity
                            }
                            onSelectCommunity={
                                handleCommunitySelect
                            }
                        />
                    </Card>


                    {/* 전체 커뮤니티 목록 */}
                    {!selected ? (
                        <Card
                            title="전체 커뮤니티 목록"
                            style={{ marginBottom: 20 }}
                        >
                            <Table
                                rowKey="community_id"
                                columns={communityColumns}
                                dataSource={communities}
                                pagination={{
                                    pageSize: 10,
                                }}
                                scroll={{ x: 900 }}
                            />
                        </Card>
                    ) : (
                        <>
                            {/* 선택 커뮤니티 요약 */}
                            <Card
                                title={`그룹 ${selected.community_id} 상세 분석`}
                                style={{ marginBottom: 20 }}
                            >
                                <Row gutter={[16, 16]}>
                                    <Col xs={12} md={8}>
                                        <Statistic
                                            title="소속 고객"
                                            value={
                                                selected.customer_count
                                            }
                                            suffix="명"
                                        />
                                    </Col>

                                    <Col xs={12} md={8}>
                                        <Statistic
                                            title="특화 제품"
                                            value={
                                                products.length
                                            }
                                            suffix="개"
                                        />
                                    </Col>

                                    <Col xs={12} md={8}>
                                        <Statistic
                                            title="교차 판매 후보"
                                            value={
                                                selected.cross_sell_total
                                            }
                                            suffix="건"
                                        />
                                    </Col>
                                </Row>

                                <Title
                                    level={5}
                                    style={{ marginTop: 24 }}
                                >
                                    {selected.segment_name}
                                </Title>

                                <Text type="secondary">
                                    커뮤니티 구매율과 전체 고객 구매율을
                                    비교하여 특화 제품을 추출했습니다.
                                </Text>
                            </Card>


                            {/* 특화 제품 TOP 5 */}
                            <Card
                                title="커뮤니티 특화 제품 TOP 5"
                                style={{ marginBottom: 20 }}
                            >
                                {products.length ? (
                                    <Table
                                        rowKey="code"
                                        columns={productColumns}
                                        dataSource={products}
                                        pagination={false}
                                        scroll={{ x: 750 }}
                                    />
                                ) : (
                                    <Empty
                                        description="분석 가능한 특화 제품이 없습니다."
                                    />
                                )}

                                <Alert
                                    type="info"
                                    showIcon
                                    style={{ marginTop: 16 }}
                                    message={
                                        "Lift = 커뮤니티 구매율 ÷ 전체 고객 구매율. " +
                                        "1보다 크면 전체 평균 대비 구매율이 높습니다."
                                    }
                                />
                            </Card>


                            {/* 교차 판매 고객 */}
                            <Card
                                title="교차 판매 대상 고객"
                                style={{ marginBottom: 20 }}
                            >
                                <Text type="secondary">
                                    커뮤니티 특화 제품을 아직 구매하지
                                    않은 고객을 추출했습니다.
                                </Text>

                                <Table
                                    style={{ marginTop: 16 }}
                                    rowKey={(row) =>
                                        `${row.customer_code}-${row.product_code}`
                                    }
                                    columns={targetColumns}
                                    dataSource={targets}
                                    pagination={{
                                        pageSize: 10,
                                    }}
                                    scroll={{ x: 900 }}
                                    locale={{
                                        emptyText:
                                            "교차 판매 후보가 없습니다.",
                                    }}
                                />
                            </Card>
                        </>
                    )}


                    {/* =====================================
              고객별 맞춤 추천 TOP 3
          ===================================== */}
                    <Card
                        title="고객별 맞춤 제품 추천 TOP 3"
                        style={{ marginBottom: 20 }}
                    >
                        <Alert
                            type="info"
                            showIcon
                            message={
                                "고객 구매 이력, 유사 고객의 구매 패턴, " +
                                "커뮤니티 특성을 분석하여 " +
                                "미구매 제품 TOP 3를 추천합니다."
                            }
                            style={{ marginBottom: 16 }}
                        />

                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                                <Text strong>
                                    추천 대상 고객 선택
                                </Text>

                                <Select
                                    showSearch
                                    allowClear
                                    optionFilterProp="label"
                                    placeholder="고객명 또는 고객코드 검색"
                                    style={{
                                        width: "100%",
                                        marginTop: 8,
                                    }}
                                    value={selectedCustomer}
                                    options={availableCustomers}
                                    onChange={(value) =>
                                        setSelectedCustomer(
                                            value ?? null
                                        )
                                    }
                                />
                            </Col>

                            <Col xs={24} md={12}>
                                <Text strong>
                                    현재 분석 대상
                                </Text>

                                <div style={{ marginTop: 8 }}>
                                    <Tag color="blue">
                                        {selected
                                            ? `그룹 ${selected.community_id}`
                                            : "전체 고객"}
                                    </Tag>

                                    <Text type="secondary">
                                        선택 가능 고객:{" "}
                                        {formatNumber(
                                            availableCustomers.length
                                        )}
                                        명
                                    </Text>
                                </div>
                            </Col>
                        </Row>

                        <div style={{ marginTop: 20 }}>
                            <CustomerRecommendation
                                customerCode={
                                    selectedCustomer
                                }
                                minSimilarity={
                                    similarity
                                }
                            />
                        </div>
                    </Card>
                </>
            ) : (
                <Card>
                    <Empty
                        description="분석 결과가 없습니다."
                    />
                </Card>
            )}
        </main>
    );
}
