import { useFlow } from "@/lib/flowStore";
import { NODE_WIDTH, NODE_H } from "./CanvasNode";

// Cubic bezier from bottom-center of source to top-center of target
function bezierPath(x1, y1, x2, y2) {
  const dy = Math.abs(y2 - y1);
  const cp = Math.max(60, dy * 0.5);
  return `M ${x1} ${y1} C ${x1} ${y1 + cp}, ${x2} ${y2 - cp}, ${x2} ${y2}`;
}

export default function EdgeLayer({ canvasRef }) {
  const { nodes, edges, removeEdge, pendingConnection } = useFlow();

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // Port positions: output = bottom center, input = top center
  const getOutputPort = (node) => ({
    x: node.position.x + NODE_WIDTH / 2,
    y: node.position.y + NODE_H + 4, // +4 for padding
  });

  const getInputPort = (node) => ({
    x: node.position.x + NODE_WIDTH / 2,
    y: node.position.y,
  });

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M 0 0 L 6 3 L 0 6 Z" fill="hsl(var(--primary))" opacity="0.7" />
        </marker>
        <marker
          id="arrowhead-muted"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M 0 0 L 6 3 L 0 6 Z" fill="hsl(var(--muted-foreground))" opacity="0.5" />
        </marker>
      </defs>

      {edges.map((edge) => {
        const fromNode = nodeMap[edge.from];
        const toNode = nodeMap[edge.to];
        if (!fromNode || !toNode) return null;

        const from = getOutputPort(fromNode);
        const to = getInputPort(toNode);
        const path = bezierPath(from.x, from.y, to.x, to.y);

        return (
          <g key={edge.id} className="pointer-events-auto">
            {/* Invisible wider hit area */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth="12"
              className="cursor-pointer"
              onClick={() => removeEdge(edge.id)}
            >
              <title>Click to remove connection</title>
            </path>
            {/* Visible line */}
            <path
              d={path}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeOpacity="0.6"
              strokeDasharray="6 3"
              markerEnd="url(#arrowhead)"
              className="transition-all"
            />
          </g>
        );
      })}

      {/* Pending connection preview — ghost line from source output port to... nowhere yet */}
      {pendingConnection && (() => {
        const src = nodeMap[pendingConnection.fromNodeId];
        if (!src) return null;
        const from = getOutputPort(src);
        return (
          <circle
            cx={from.x}
            cy={from.y}
            r={5}
            fill="hsl(var(--primary))"
            opacity="0.8"
            className="animate-pulse"
          />
        );
      })()}
    </svg>
  );
}
