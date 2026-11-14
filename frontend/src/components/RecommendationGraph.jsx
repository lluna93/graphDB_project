
import { useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

export default function RecommendationGraph({ graph }) {
    const graphRef = useRef(null);
    const [width, setWidth] = useState(700);

    const data = useMemo(
        () => ({
            nodes: (graph?.nodes || []).map((n) => ({ ...n })),
            links: (graph?.links || []).map((l) => ({ ...l })),
        }),
        [graph]
    );

    return (
        <div
            ref={(element) => {
                if (!element) return;
                const nextWidth = element.clientWidth;
                if (nextWidth && nextWidth !== width) {
                    setWidth(nextWidth);
                }
            }}
            style={{
                width: "100%",
                height: 360,
                background: "#f8fafc",
                borderRadius: 12,
                overflow: "hidden",
            }}
        >
            <ForceGraph2D
                ref={graphRef}
                graphData={data}
                width={width}
                height={360}
                backgroundColor="#f8fafc"
                nodeLabel={(node) =>
                    node.type === "customer"
                        ? `고객: ${node.name}`
                        : `TOP ${node.rank}: ${node.name} (${node.score}점)`
                }
                nodeCanvasObject={(node, ctx) => {
                    const isCustomer = node.type === "customer";
                    const radius = isCustomer ? 30 : 24;

                    ctx.beginPath();
                    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
                    ctx.fillStyle = isCustomer
                        ? "#2563eb"
                        : "#7c3aed";
                    ctx.fill();

                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#fff";
                    ctx.font = "bold 11px sans-serif";

                    ctx.fillText(
                        isCustomer ? "고객" : `TOP ${node.rank}`,
                        node.x,
                        node.y - 5
                    );

                    ctx.font = "10px sans-serif";
                    ctx.fillText(
                        isCustomer ? node.name : `${node.score}점`,
                        node.x,
                        node.y + 10
                    );

                    ctx.fillStyle = "#334155";
                    ctx.font = "11px sans-serif";
                    ctx.fillText(
                        isCustomer ? "" : node.name.slice(0, 18),
                        node.x,
                        node.y + radius + 15
                    );
                }}
                nodePointerAreaPaint={(node, color, ctx) => {
                    const radius =
                        node.type === "customer" ? 30 : 24;

                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                }}
                linkColor={() => "#94a3b8"}
                linkWidth={(link) => Math.max(1, link.weight / 20)}
                linkDirectionalArrowLength={5}
                linkDirectionalArrowRelPos={1}
                d3Force="link"
                cooldownTicks={100}
                onEngineStop={() =>
                    graphRef.current?.zoomToFit(300, 45)
                }
            />
        </div>
    );
}
