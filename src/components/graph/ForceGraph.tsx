"use client";
import { useEffect, useRef, useState } from "react";
import type { GraphData, GraphNode, GraphLink } from "@/types/database";

interface Props {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// 基于字符串种子的确定性伪随机（避免 Math.random 在 render/effect 中触发警告）
function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

export default function ForceGraph({ data, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const width = 800;
  const height = 600;

  // ========== 初始化：数据变化时，在 rAF 回调里异步 setState ==========
  useEffect(() => {
    if (!data.nodes.length) {
      const id = requestAnimationFrame(() => setNodes([]));
      return () => cancelAnimationFrame(id);
    }

    const id = requestAnimationFrame(() => {
      setNodes(
        data.nodes.map((n) => ({
          ...n,
          x: width / 2 + (seededRandom(n.id + "x") - 0.5) * 300,
          y: height / 2 + (seededRandom(n.id + "y") - 0.5) * 300,
          vx: 0,
          vy: 0,
        })),
      );
    });
    return () => cancelAnimationFrame(id);
  }, [data.nodes]);

  // ========== 物理模拟：只在 rAF 回调里函数式 setState ==========
  useEffect(() => {
    if (!nodes.length) return;
    let rafId: number;

    const simulate = () => {
      setNodes((prev) => {
        if (!prev.length) return prev;
        const next = prev.map((n) => ({ ...n }));

        const repulsion = 800;
        const springLength = 140;
        const springStrength = 0.05;
        const damping = 0.9;
        const centerStrength = 0.01;

        // 斥力
        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const dx = next[j].x - next[i].x;
            const dy = next[j].y - next[i].y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = repulsion / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            next[i].vx -= fx;
            next[i].vy -= fy;
            next[j].vx += fx;
            next[j].vy += fy;
          }
        }

        // 弹簧
        for (const link of data.links) {
          const source = next.find((n) => n.id === link.source);
          const target = next.find((n) => n.id === link.target);
          if (!source || !target) continue;
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - springLength) * springStrength;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          source.vx += fx;
          source.vy += fy;
          target.vx -= fx;
          target.vy -= fy;
        }

        // 中心引力 + 阻尼 + 边界
        for (const node of next) {
          if (dragging === node.id) continue;
          node.vx += (width / 2 - node.x) * centerStrength;
          node.vy += (height / 2 - node.y) * centerStrength;
          node.vx *= damping;
          node.vy *= damping;
          node.x += node.vx;
          node.y += node.vy;
          node.x = Math.max(30, Math.min(width - 30, node.x));
          node.y = Math.max(30, Math.min(height - 30, node.y));
        }

        return next;
      });

      rafId = requestAnimationFrame(simulate);
    };

    rafId = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(rafId);
  }, [nodes.length, data.links, dragging]);

  const handleMouseDown = (nodeId: string) => setDragging(nodeId);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setNodes((prev) =>
      prev.map((n) => (n.id === dragging ? { ...n, x, y, vx: 0, vy: 0 } : n)),
    );
  };

  const handleMouseUp = () => setDragging(null);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="w-full h-full bg-[var(--bg)] rounded-xl border border-[var(--border)]"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <defs>
        {data.links.map((link, i) => {
          const source = nodes.find((n) => n.id === link.source);
          const target = nodes.find((n) => n.id === link.target);
          if (!source || !target) return null;
          return (
            <marker
              key={`arrow-${i}`}
              id={`arrow-${i}`}
              viewBox="0 0 10 10"
              refX={25}
              refY={5}
              markerWidth={6}
              markerHeight={6}
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--fg-muted)" />
            </marker>
          );
        })}
      </defs>

      {data.links.map((link, i) => {
        const source = nodes.find((n) => n.id === link.source);
        const target = nodes.find((n) => n.id === link.target);
        if (!source || !target) return null;
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;

        return (
          <g key={`link-${i}`}>
            <line
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="var(--fg-muted)"
              strokeWidth={Math.min(link.value, 5)}
              strokeOpacity={0.3}
              markerEnd={`url(#arrow-${i})`}
            />
            {link.relation_type && (
              <g transform={`translate(${midX},${midY})`}>
                <rect
                  x={-(link.relation_type.length * 6 + 8)}
                  y={-10}
                  width={link.relation_type.length * 12 + 16}
                  height={20}
                  rx={4}
                  fill="var(--bg-soft)"
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fill="var(--fg)"
                  fontSize={11}
                  fontWeight={500}
                >
                  {link.relation_type}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {nodes.map((node) => (
        <g
          key={node.id}
          transform={`translate(${node.x},${node.y})`}
          className="cursor-pointer"
          onMouseDown={() => handleMouseDown(node.id)}
          onClick={() => onNodeClick?.(node)}
        >
          <circle
            r={Math.max(15, Math.min(35, 10 + node.val * 2))}
            fill={node.color}
            stroke="var(--bg)"
            strokeWidth={2}
            className="transition-all hover:opacity-90"
          />
          <text
            textAnchor="middle"
            dy="0.35em"
            fill="#fff"
            fontSize={12}
            fontWeight={500}
            style={{ pointerEvents: "none" }}
          >
            {node.name.length > 4 ? node.name.slice(0, 3) + "…" : node.name}
          </text>
        </g>
      ))}
    </svg>
  );
}
