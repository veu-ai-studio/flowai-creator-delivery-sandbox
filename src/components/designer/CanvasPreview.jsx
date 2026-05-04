import { useMemo } from "react";
import { BLOCK_TYPES } from "@/lib/flowStore";

const NODE_W = 110;
const NODE_H = 42;
const PAD = 24;

// Map block type → small icon char (fallback to first letter)
const TYPE_ICONS = {
  input:     "→",
  ai:        "✦",
  action:    "⚙",
  output:    "◎",
  condition: "⬡",
};

function getBezierPath(x1, y1, x2, y2) {
  const cx = (x1 + x2) / 2;
  return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
}

export default function CanvasPreview({ nodes = [], edges = [], width = 320, height = 180 }) {
  // Normalise node positions to fit the preview box
  const { scaledNodes, viewBox } = useMemo(() => {
    if (nodes.length === 0) return { scaledNodes: [], viewBox: `0 0 ${width} ${height}` };

    const xs = nodes.map((n) => n.position?.x ?? 0);
    const ys = nodes.map((n) => n.position?.y ?? 0);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs) + NODE_W;
    const maxY = Math.max(...ys) + NODE_H;
    const contentW = maxX - minX + PAD * 2;
    const contentH = maxY - minY + PAD * 2;

    const scale = Math.min((width - PAD * 2) / contentW, (height - PAD * 2) / contentH, 1);

    const offsetX = (width - contentW * scale) / 2;
    const offsetY = (height - contentH * scale) / 2;

    const scaledNodes = nodes.map((n) => ({
      ...n,
      sx: (((n.position?.x ?? 0) - minX) + PAD) * scale + offsetX,
      sy: (((n.position?.y ?? 0) - minY) + PAD) * scale + offsetY,
      sw: NODE_W * scale,
      sh: NODE_H * scale,
    }));

    return { scaledNodes, viewBox: `0 0 ${width} ${height}` };
  }, [nodes, width, height]);

  const nodeMap = Object.fromEntries(scaledNodes.map((n) => [n.id, n]));

  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      className="rounded-lg"
      style={{ background: "transparent" }}
    >
      {/* Dot grid */}
      <defs>
        <pattern id="cpgrid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.7" fill="hsl(var(--border))" opacity="0.5" />
        </pattern>
        <marker id="cp-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="hsl(var(--muted-foreground))" opacity="0.5" />
        </marker>
      </defs>
      <rect width={width} height={height} fill="url(#cpgrid)" />

      {/* Edges */}
      {edges.map((edge) => {
        const from = nodeMap[edge.from];
        const to = nodeMap[edge.to];
        if (!from || !to) return null;
        const x1 = from.sx + from.sw / 2;
        const y1 = from.sy + from.sh;
        const x2 = to.sx + to.sw / 2;
        const y2 = to.sy;
        return (
          <path
            key={edge.id}
            d={getBezierPath(x1, y1, x2, y2)}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="1.2"
            strokeOpacity="0.45"
            markerEnd="url(#cp-arrow)"
          />
        );
      })}

      {/* Nodes */}
      {scaledNodes.map((node) => {
        const meta = BLOCK_TYPES[node.type] || {};
        // Parse colour from tailwind class names for SVG use
        const borderOpacity = 0.55;
        const fillOpacity = 0.18;

        // colour map (matches index.css chart tokens)
        const colorMap = {
          input:     { stroke: "#34d399", fill: "#34d399" },
          ai:        { stroke: "#60a5fa", fill: "#60a5fa" },
          action:    { stroke: "#a78bfa", fill: "#a78bfa" },
          output:    { stroke: "#818cf8", fill: "#818cf8" },
          condition: { stroke: "#fbbf24", fill: "#fbbf24" },
        };
        const c = colorMap[node.type] || { stroke: "#94a3b8", fill: "#94a3b8" };
        const icon = TYPE_ICONS[node.type] || "?";
        const label = (node.config?.label || meta.label || node.type);
        const labelTrunc = label.length > 14 ? label.slice(0, 13) + "…" : label;
        const iconSize = Math.max(8, node.sh * 0.38);
        const fontSize = Math.max(7, node.sh * 0.22);
        const rx = Math.min(8, node.sh * 0.18);

        return (
          <g key={node.id}>
            <rect
              x={node.sx}
              y={node.sy}
              width={node.sw}
              height={node.sh}
              rx={rx}
              fill={c.fill}
              fillOpacity={fillOpacity}
              stroke={c.stroke}
              strokeOpacity={borderOpacity}
              strokeWidth="1.2"
            />
            {/* icon */}
            <text
              x={node.sx + node.sw * 0.18}
              y={node.sy + node.sh / 2 + iconSize * 0.35}
              fontSize={iconSize}
              fill={c.stroke}
              fillOpacity={0.9}
              textAnchor="middle"
            >
              {icon}
            </text>
            {/* label */}
            <text
              x={node.sx + node.sw * 0.56}
              y={node.sy + node.sh / 2 + fontSize * 0.35}
              fontSize={fontSize}
              fill="hsl(var(--foreground))"
              fillOpacity={0.85}
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
            >
              {labelTrunc}
            </text>
          </g>
        );
      })}

      {/* Empty state */}
      {nodes.length === 0 && (
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))" fillOpacity="0.5">
          No blocks yet
        </text>
      )}
    </svg>
  );
}