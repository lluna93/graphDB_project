
import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

const COLORS = [
    "#1677ff", "#722ed1", "#13a8a8",
    "#fa8c16", "#eb2f96", "#52c41a",
    "#2f54eb", "#fa541c", "#08979c",
];

export function communityColor(id) {
    return COLORS[(Number(id) - 1) % COLORS.length];
}

export default function CommunityNetwork({
                                             data,
                                             selectedCommunity,
                                             onSelectCommunity,
                                         }) {
    const containerRef = useRef(null);
    const graphRef = useRef(null);
    const [width, setWidth] = useState(800);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(([entry]) => {
            setWidth(entry.contentRect.width);
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const graphData = useMemo(() => {
        if (!data) return { nodes: [], links: [] };

        // 전체 화면: 커뮤니티 단위 축약 그래프
        if (selectedCommunity == null) {
            return {
                nodes: data.community_graph.nodes.map(
                    (n) => ({ ...n })
                ),
                links: data.community_graph.links.map(
                    (l) => ({ ...l })
                ),
            };
        }

        // 선택 커뮤니티: 고객별 관계 그래프
        const members = data.nodes
            .filter(
                (n) => n.community_id === selectedCommunity
            )
            .sort((a, b) => b.degree - a.degree)
            .slice(0, 80);

        const ids = new Set(members.map((n) => n.id));

        const links = data.links.filter((l) => {
            const source =
                typeof l.source === "object"
                    ? l.source.id
                    : l.source;

            const target =
                typeof l.target === "object"
                    ? l.target.id
                    : l.target;

            return ids.has(source) && ids.has(target);
        });

        return {
            nodes: members.map((n) => ({ ...n })),
            links: links
                .sort((a, b) => b.weight - a.weight)
                .slice(0, 350)
                .map((l) => ({ ...l })),
        };
    }, [data, selectedCommunity]);

    useEffect(() => {
        if (!graphData.nodes.length) return;

        const timer = setTimeout(() => {
            graphRef.current?.zoomToFit(500, 45);
        }, 1000);

        return () => clearTimeout(timer);
    }, [graphData]);

    const isOverview = selectedCommunity == null;

    return (
        <div
            ref={containerRef}
            style={{
                height: 520,
                width: "100%",
                background: "#f8fafc",
                borderRadius: 12,
                overflow: "hidden",
            }}
        >
            <ForceGraph2D
                ref={graphRef}
                width={width}
                height={520}
                graphData={graphData}
                backgroundColor="#f8fafc"
                nodeColor={(n) =>
                    communityColor(n.community_id)
                }
                nodeVal={(n) =>
                    isOverview
                        ? Math.max(
                            6,
                            Math.sqrt(n.customer_count) * 2
                        )
                        : Math.max(
                            3,
                            Math.min(10, 3 + n.degree * 0.15)
                        )
                }
                nodeLabel={(n) =>
                    isOverview
                        ? `${n.name}\n고객 ${n.customer_count}명`
                        : `${n.name}\n구매 제품 ${n.product_count}개`
                }
                nodeCanvasObject={(node, ctx, scale) => {
                    const radius = isOverview
                        ? Math.max(
                            9,
                            Math.sqrt(node.customer_count) * 2.5
                        )
                        : Math.max(
                            4,
                            Math.min(11, 4 + node.degree * 0.15)
                        );

                    ctx.beginPath();
                    ctx.arc(
                        node.x, node.y, radius,
                        0, 2 * Math.PI
                    );
                    ctx.fillStyle = communityColor(
                        node.community_id
                    );
                    ctx.fill();

                    if (isOverview) {
                        ctx.fillStyle = "#fff";
                        ctx.font = "bold 12px sans-serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText(
                            `그룹 ${node.community_id}`,
                            node.x,
                            node.y
                        );
                    } else if (scale > 2.5) {
                        ctx.font = "10px sans-serif";
                        ctx.fillStyle = "#334155";
                        ctx.textAlign = "center";
                        ctx.fillText(
                            node.name,
                            node.x,
                            node.y + radius + 12
                        );
                    }
                }}
                nodePointerAreaPaint={(node, color, ctx) => {
                    const radius = isOverview
                        ? Math.max(
                            9,
                            Math.sqrt(node.customer_count) * 2.5
                        )
                        : Math.max(
                            4,
                            Math.min(11, 4 + node.degree * 0.15)
                        );

                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(
                        node.x, node.y, radius,
                        0, 2 * Math.PI
                    );
                    ctx.fill();
                }}
                onNodeClick={(node) => {
                    if (isOverview) {
                        onSelectCommunity(node.community_id);
                    }
                }}
                linkWidth={(l) =>
                    isOverview
                        ? Math.min(6, 1 + l.weight * 0.15)
                        : 0.5 + l.weight * 2
                }
                linkColor={() => "rgba(100,116,139,0.25)"}
                cooldownTicks={100}
                d3VelocityDecay={0.4}
                enableNodeDrag
            />
        </div>
    );
}
