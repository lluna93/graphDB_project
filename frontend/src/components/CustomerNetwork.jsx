
import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Drawer, Descriptions, Empty, Tag } from "antd";
import styled from "styled-components";

const GraphContainer = styled.div`
  width: 100%;
  height: 620px;
  border: 1px solid #e8eaf0;
  border-radius: 12px;
  overflow: hidden;
  background: #fafbff;
`;

const COLORS = {
    고객: "#1677ff",
    지역: "#52c41a",
    판매: "#faad14",
    제품: "#722ed1",
    제품분류: "#eb2f96",
    분류: "#13c2c2",
    채널: "#fa541c",
    프로모션: "#2f54eb",
};

export default function CustomerNetwork({ nodes = [], links = [] }) {
    const containerRef = useRef(null);
    const graphRef = useRef(null);

    const [size, setSize] = useState({ width: 900, height: 620 });
    const [selectedNode, setSelectedNode] = useState(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const width = entries[0]?.contentRect.width;

            if (width) {
                setSize({ width, height: 620 });
            }
        });

        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    const graphData = useMemo(
        () => ({
            nodes: nodes.map((node) => ({ ...node })),
            links: links.map((link) => ({ ...link })),
        }),
        [nodes, links]
    );

    useEffect(() => {
        if (!graphRef.current || nodes.length === 0) return;

        const timer = setTimeout(() => {
            graphRef.current?.zoomToFit(500, 60);
        }, 800);

        return () => clearTimeout(timer);
    }, [nodes, links]);

    const drawNode = (node, ctx, globalScale) => {
        const radius = node.label === "고객" ? 11 : 7;
        const color = COLORS[node.label] || "#8c8c8c";

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        const fontSize = Math.max(3, 12 / globalScale);

        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#222";

        const label = String(node.name || node.id);

        ctx.fillText(
            label.length > 18 ? `${label.slice(0, 18)}...` : label,
            node.x,
            node.y + radius + fontSize
        );
    };

    if (!nodes.length) {
        return (
            <GraphContainer>
                <Empty
                    description="고객을 선택하면 관계 그래프가 표시됩니다."
                    style={{ marginTop: 230 }}
                />
            </GraphContainer>
        );
    }

    return (
        <>
            <GraphContainer ref={containerRef}>
                <ForceGraph2D
                    ref={graphRef}
                    width={size.width}
                    height={size.height}
                    graphData={graphData}
                    nodeLabel={(node) => `${node.label}: ${node.name}`}
                    nodeCanvasObject={drawNode}
                    nodePointerAreaPaint={(node, color, ctx) => {
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI);
                        ctx.fill();
                    }}
                    linkColor={() => "#c8ceda"}
                    linkWidth={1.3}
                    linkDirectionalArrowLength={4}
                    linkDirectionalArrowRelPos={1}
                    onNodeClick={(node) => setSelectedNode(node)}
                    cooldownTicks={120}
                    d3VelocityDecay={0.35}
                    backgroundColor="#fafbff"
                />
            </GraphContainer>

            <Drawer
                title="노드 상세정보"
                open={!!selectedNode}
                onClose={() => setSelectedNode(null)}
                width={420}
            >
                {selectedNode && (
                    <>
                        <Tag color={COLORS[selectedNode.label]}>
                            {selectedNode.label}
                        </Tag>

                        <h3>{selectedNode.name}</h3>

                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="노드 ID">
                                {selectedNode.id}
                            </Descriptions.Item>

                            {Object.entries(selectedNode.properties || {}).map(
                                ([key, value]) => (
                                    <Descriptions.Item label={key} key={key}>
                                        {value === null || value === undefined
                                            ? "-"
                                            : typeof value === "object"
                                                ? JSON.stringify(value)
                                                : String(value)}
                                    </Descriptions.Item>
                                )
                            )}
                        </Descriptions>
                    </>
                )}
            </Drawer>
        </>
    );
}
