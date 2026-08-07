"use client";
import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import type { GraphData, GraphNode } from "@/types/database";

interface Props {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  degree: number;
  mainRelation: string | null;
  _r: number;
  _color: string;
  _isHot: boolean;
  _label: string;
}

interface ProcessedLink {
  source: string;
  target: string;
  relation_type?: string | null;
  value?: number;
  sourceIndex: number;
  targetIndex: number;
  _labelWidth: number;
}

interface ViewTransform {
  x: number;
  y: number;
  k: number;
}

/* ---------- 工具函数 ---------- */

function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

function getBaseRadius(val = 0) {
  return Math.max(48, Math.min(114, 30 + val * 6));
}

function getNodeRadius(node: SimNode) {
  const base = getBaseRadius(node.val ?? 0);
  return node.degree > 5 ? base * 1.3 : base;
}

function getNodeColor(node: SimNode) {
  return node.degree > 5 ? "#fbbf24" : node.color || "#ef4444";
}

function getBounds(nodes: SimNode[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of nodes) {
    const r = n._r;
    minX = Math.min(minX, n.x - r - 20);
    minY = Math.min(minY, n.y - r - 20);
    maxX = Math.max(maxX, n.x + r + 20);
    maxY = Math.max(maxY, n.y + r + 20);
  }
  return { minX, minY, maxX, maxY };
}

function getFitView(nodes: SimNode[], cw: number, ch: number): ViewTransform {
  if (!nodes.length) return { x: 0, y: 0, k: 1 };
  const { minX, minY, maxX, maxY } = getBounds(nodes);
  const contentW = Math.max(maxX - minX, 100);
  const contentH = Math.max(maxY - minY, 100);
  const pad = 30;
  const k = Math.min(
    Math.max((cw - pad * 2) / contentW, 0.35),
    (ch - pad * 2) / contentH,
    1.5,
  );
  const x = (cw - contentW * k) / 2 - minX * k;
  const y = (ch - contentH * k) / 2 - minY * k;
  return { x, y, k };
}

function screenToWorld(
  sx: number,
  sy: number,
  view: ViewTransform,
): { x: number; y: number } {
  return {
    x: (sx - view.x) / view.k,
    y: (sy - view.y) / view.k,
  };
}

/* ---------- 组件 ---------- */

export default function ForceGraph({ data, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);

  const nodesRef = useRef<SimNode[]>([]);
  const linksRef = useRef<ProcessedLink[]>([]);
  const viewRef = useRef<ViewTransform>({ x: 0, y: 0, k: 1 });

  const draggingNodeRef = useRef<string | null>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ sx: 0, sy: 0, viewX: 0, viewY: 0 });
  const clickStartRef = useRef({ sx: 0, sy: 0 });
  const hoverNodeRef = useRef<string | null>(null);
  const autoFitRef = useRef(true);
  const lastInteractionRef = useRef(0);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const pauseAutoFit = useCallback(() => {
    autoFitRef.current = false;
    lastInteractionRef.current = Date.now();
  }, []);

  /* ---------- 预处理（只依赖 data） ---------- */
  const { degreeMap, nodeMainRelation, relationTypes, hotNodeIds } =
    useMemo(() => {
      const degree = new Map<string, number>();
      data.nodes.forEach((n) => degree.set(n.id, 0));
      data.links.forEach((l) => {
        degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
        degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
      });

      const types = [
        ...new Set(
          data.links.map((l) => l.relation_type).filter(Boolean) as string[],
        ),
      ];

      const mainRel = new Map<string, string | null>();
      const nodeRelCount = new Map<string, Map<string, number>>();
      data.links.forEach((l) => {
        if (!l.relation_type) return;
        [l.source, l.target].forEach((id) => {
          if (!nodeRelCount.has(id)) nodeRelCount.set(id, new Map());
          const map = nodeRelCount.get(id)!;
          map.set(
            l.relation_type as string,
            (map.get(l.relation_type as string) ?? 0) + 1,
          );
        });
      });
      data.nodes.forEach((n) => {
        const counts = nodeRelCount.get(n.id);
        if (!counts || counts.size === 0) {
          mainRel.set(n.id, null);
          return;
        }
        let best: string | null = null,
          bestCount = -1;
        counts.forEach((c, t) => {
          if (c > bestCount) {
            bestCount = c;
            best = t;
          }
        });
        mainRel.set(n.id, best);
      });

      const hotIds = new Set<string>();
      degree.forEach((d, id) => {
        if (d > 5) hotIds.add(id);
      });

      return {
        degreeMap: degree,
        nodeMainRelation: mainRel,
        relationTypes: types,
        hotNodeIds: hotIds,
      };
    }, [data]);

  /* ---------- 初始化：布局 + 预计算绘制缓存 ---------- */
  useEffect(() => {
    if (!data.nodes.length) {
      nodesRef.current = [];
      linksRef.current = [];
      if (countRef.current) countRef.current.textContent = "0";
      return;
    }

    const typeCount = relationTypes.length || 1;
    const sectorAngle = (2 * Math.PI) / typeCount;

    const newNodes: SimNode[] = data.nodes.map((n) => {
      const rel = nodeMainRelation.get(n.id);
      const deg = degreeMap.get(n.id) ?? 0;
      const typeIdx = rel ? relationTypes.indexOf(rel) : 0;
      const baseAngle = typeIdx * sectorAngle - Math.PI / 2;
      const angleNoise = (seededRandom(n.id + "a") - 0.5) * sectorAngle * 0.7;
      const angle = baseAngle + angleNoise;
      const popularity = Math.min(deg / 8, 1);
      const r =
        30 + (1 - popularity) * 80 + (seededRandom(n.id + "r") - 0.5) * 40;

      const node: SimNode = {
        ...n,
        x: Math.cos(angle) * r + (seededRandom(n.id + "x") - 0.5) * 60,
        y: Math.sin(angle) * r + (seededRandom(n.id + "y") - 0.5) * 60,
        vx: 0,
        vy: 0,
        degree: deg,
        mainRelation: rel ?? null,
        _r: 0,
        _color: "",
        _isHot: false,
        _label: "",
      };
      node._r = getNodeRadius(node);
      node._color = getNodeColor(node);
      node._isHot = deg > 5;
      node._label = n.name.length > 6 ? n.name.slice(0, 5) + "…" : n.name;
      return node;
    });

    nodesRef.current = newNodes;
    if (countRef.current)
      countRef.current.textContent = String(newNodes.length);

    const idToIndex = new Map<string, number>();
    newNodes.forEach((n, i) => idToIndex.set(n.id, i));

    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d")!;
    measureCtx.font = `500 14px ui-sans-serif, system-ui, sans-serif`;

    const newLinks: ProcessedLink[] = data.links.map((l) => {
      const text = l.relation_type || "";
      return {
        source: l.source,
        target: l.target,
        relation_type: l.relation_type,
        value: l.value,
        sourceIndex: idToIndex.get(l.source) ?? -1,
        targetIndex: idToIndex.get(l.target) ?? -1,
        _labelWidth: text ? measureCtx.measureText(text).width : 0,
      };
    });
    linksRef.current = newLinks;

    const container = containerRef.current;
    if (container) {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw && ch) {
        viewRef.current = getFitView(newNodes, cw, ch);
      }
    }
  }, [data.nodes, data.links, degreeMap, nodeMainRelation, relationTypes]);

  /* ---------- 全屏监听 ---------- */
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      autoFitRef.current = true;
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* ---------- 物理模拟：零 GC，直接修改 ref ---------- */
  useEffect(() => {
    if (!nodesRef.current.length) return;
    let rafId: number;
    let frameCount = 0;

    const typeGroups = new Map<string, number[]>();
    const nodes = nodesRef.current;
    for (let i = 0; i < nodes.length; i++) {
      const rel = nodes[i].mainRelation;
      if (!rel) continue;
      if (!typeGroups.has(rel)) typeGroups.set(rel, []);
      typeGroups.get(rel)!.push(i);
    }

    const simulate = () => {
      if (frameCount % 3 === 0) {
        const nodes = nodesRef.current;
        const links = linksRef.current;
        const n = nodes.length;
        if (!n) {
          frameCount++;
          rafId = requestAnimationFrame(simulate);
          return;
        }

        const repulsion = 3500;
        const sameTypeStrength = 0.005;
        const springLength = 60;
        const springStrength = 0.08;
        const damping = 0.85;
        const centerStrength = 0.001;
        const toHotStrength = 0.015;
        const compactStrength = 0.008;
        const noise = 0.06;
        const maxSpeed = 5;

        // 1. 斥力 + 防重叠
        for (let i = 0; i < n; i++) {
          const a = nodes[i];
          for (let j = i + 1; j < n; j++) {
            const b = nodes[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy;
            if (distSq > 160000) continue;
            const dist = Math.sqrt(distSq) || 0.1;
            const rA = a._r;
            const rB = b._r;
            const minGap = rA + rB + 15;

            let force = repulsion / dist;
            if (dist < minGap) force += (minGap - dist) * 0.5;

            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            a.vx -= fx;
            a.vy -= fy;
            b.vx += fx;
            b.vy += fy;
          }
        }

        // 2. 同类型吸引
        typeGroups.forEach((indices) => {
          for (let i = 0; i < indices.length; i++) {
            const a = nodes[indices[i]];
            for (let j = i + 1; j < indices.length; j++) {
              const b = nodes[indices[j]];
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
              const force = (dist - 80) * sameTypeStrength;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              a.vx += fx;
              a.vy += fy;
              b.vx -= fx;
              b.vy -= fy;
            }
          }
        });

        // 3. 弹簧力
        for (let i = 0; i < links.length; i++) {
          const link = links[i];
          const s = nodes[link.sourceIndex];
          const t = nodes[link.targetIndex];
          if (!s || !t) continue;
          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const force = (dist - springLength) * springStrength;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          s.vx += fx;
          s.vy += fy;
          t.vx -= fx;
          t.vy -= fy;
        }

        // 4. 中心引力 + 热门靠拢 + 收缩 + 噪声 + 阻尼
        const hotNodes: SimNode[] = [];
        for (let i = 0; i < n; i++) {
          if (hotNodeIds.has(nodes[i].id)) hotNodes.push(nodes[i]);
        }

        const nowFrame = Math.floor(Date.now() / 16) % 60;

        for (let i = 0; i < n; i++) {
          const node = nodes[i];
          if (draggingNodeRef.current === node.id) continue;

          node.vx += (0 - node.x) * centerStrength;
          node.vy += (0 - node.y) * centerStrength;

          if (!hotNodeIds.has(node.id) && hotNodes.length > 0) {
            let nearestDist = Infinity,
              nearestX = 0,
              nearestY = 0;
            for (let h = 0; h < hotNodes.length; h++) {
              const other = hotNodes[h];
              const dx = other.x - node.x;
              const dy = other.y - node.y;
              const d = dx * dx + dy * dy;
              if (d < nearestDist) {
                nearestDist = d;
                nearestX = other.x;
                nearestY = other.y;
              }
            }
            if (nearestDist < Infinity) {
              const nd = Math.sqrt(nearestDist);
              const dx = nearestX - node.x;
              const dy = nearestY - node.y;
              const d = nd || 0.1;
              node.vx += (dx / d) * toHotStrength * Math.min(d, 200);
              node.vy += (dy / d) * toHotStrength * Math.min(d, 200);
            }
          }

          const distFromCenter = Math.sqrt(node.x * node.x + node.y * node.y);
          if (distFromCenter > 100) {
            const shrink = (distFromCenter - 100) * compactStrength;
            node.vx -= (node.x / distFromCenter) * shrink;
            node.vy -= (node.y / distFromCenter) * shrink;
          }

          node.vx += (seededRandom(node.id + "n" + nowFrame) - 0.5) * noise;
          node.vy += (seededRandom(node.id + "m" + nowFrame) - 0.5) * noise;

          node.vx *= damping;
          node.vy *= damping;
          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          if (speed > maxSpeed) {
            node.vx = (node.vx / speed) * maxSpeed;
            node.vy = (node.vy / speed) * maxSpeed;
          }
          node.x += node.vx;
          node.y += node.vy;
        }
      }

      if (
        autoFitRef.current &&
        containerRef.current &&
        !draggingNodeRef.current
      ) {
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        if (cw && ch) {
          const target = getFitView(nodesRef.current, cw, ch);
          const cur = viewRef.current;
          const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
          const needUpdate =
            Math.abs(target.k - cur.k) > 0.005 ||
            Math.abs(target.x - cur.x) > 0.5 ||
            Math.abs(target.y - cur.y) > 0.5;

          if (needUpdate) {
            viewRef.current = {
              x: lerp(cur.x, target.x, 0.08),
              y: lerp(cur.y, target.y, 0.08),
              k: lerp(cur.k, target.k, 0.08),
            };
          }
        }
      }

      if (
        !autoFitRef.current &&
        Date.now() - lastInteractionRef.current > 1500
      ) {
        autoFitRef.current = true;
      }

      frameCount++;
      rafId = requestAnimationFrame(simulate);
    };

    rafId = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(rafId);
  }, [hotNodeIds]);

  /* ---------- Canvas 绘制循环（60fps，零 React 参与） ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let rafId: number;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (
        canvas.width !== Math.floor(cw * dpr) ||
        canvas.height !== Math.floor(ch * dpr)
      ) {
        canvas.width = Math.floor(cw * dpr);
        canvas.height = Math.floor(ch * dpr);
        canvas.style.width = cw + "px";
        canvas.style.height = ch + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const drawArrow = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      r: number,
    ) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < r + 10) return;

      const ratio = (dist - r - 8) / dist;
      const ax = x1 + dx * ratio;
      const ay = y1 + dy * ratio;

      const angle = Math.atan2(dy, dx);
      const headLen = 9;
      const c = Math.cos(angle);
      const s = Math.sin(angle);

      const p1x = ax;
      const p1y = ay;
      const p2x = ax - headLen * c + headLen * 0.5 * s;
      const p2y = ay - headLen * s - headLen * 0.5 * c;
      const p3x = ax - headLen * c - headLen * 0.5 * s;
      const p3y = ay - headLen * s + headLen * 0.5 * c;

      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fill();
    };

    const roundRectPath = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
    ) => {
      const radius = Math.min(r, w / 2, h / 2);
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.arcTo(x + w, y, x + w, y + radius, radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.arcTo(x + w, y + h, x + w - radius, y + h, radius);
      ctx.lineTo(x + radius, y + h);
      ctx.arcTo(x, y + h, x, y + h - radius, radius);
      ctx.lineTo(x, y + radius);
      ctx.arcTo(x, y, x + radius, y, radius);
      ctx.closePath();
    };

    const draw = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const view = viewRef.current;
      const nodes = nodesRef.current;
      const links = linksRef.current;

      ctx.fillStyle = "var(--bg, #ffffff)";
      ctx.fillRect(0, 0, cw, ch);

      if (!nodes.length) {
        rafId = requestAnimationFrame(draw);
        return;
      }

      ctx.save();
      ctx.translate(view.x, view.y);
      ctx.scale(view.k, view.k);

      // ---- 绘制边 ----
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const s = nodes[link.sourceIndex];
        const t = nodes[link.targetIndex];
        if (!s || !t) continue;

        const strokeWidth = Math.min((link.value ?? 1) * 1.5, 8);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = strokeWidth / view.k;
        ctx.stroke();

        drawArrow(s.x, s.y, t.x, t.y, t._r);

        if (link.relation_type) {
          const midX = (s.x + t.x) / 2;
          const midY = (s.y + t.y) / 2;
          const text = link.relation_type;
          const fontSize = 14;
          const textWidth = link._labelWidth;
          const padX = 12;
          const padY = 7;
          const w = textWidth + padX * 2;
          const h = fontSize + padY * 2;

          ctx.save();
          ctx.translate(midX, midY);

          ctx.beginPath();
          roundRectPath(-w / 2, -h / 2, w, h, 6);
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 1 / view.k;
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.font = `500 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }

      // ---- 绘制节点 ----
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const r = node._r;
        const color = node._color;
        const isHot = node._isHot;

        if (isHot) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.25;
          ctx.lineWidth = 3 / view.k;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "var(--bg, #ffffff)";
        ctx.lineWidth = 2 / view.k;
        ctx.stroke();

        ctx.fillStyle = isHot ? "#1f2937" : "#ffffff";
        ctx.font = `600 16px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node._label, node.x, node.y);

        if (isHot) {
          const bx = node.x + r * 0.6;
          const by = node.y - r * 0.6;
          const br = 14;

          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fillStyle = "#1f2937";
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2 / view.k;
          ctx.stroke();

          ctx.fillStyle = color;
          ctx.font = `700 11px ui-sans-serif, system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(node.degree), bx, by);
        }
      }

      ctx.restore();
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  /* ---------- 交互 ---------- */
  const pickNode = useCallback((sx: number, sy: number): SimNode | null => {
    const view = viewRef.current;
    const world = screenToWorld(sx, sy, view);
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = world.x - n.x;
      const dy = world.y - n.y;
      if (dx * dx + dy * dy <= n._r * n._r) {
        return n;
      }
    }
    return null;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      pauseAutoFit();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cur = viewRef.current;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newK = Math.min(Math.max(cur.k * delta, 0.2), 3);
      viewRef.current = {
        x: mx - (mx - cur.x) * (newK / cur.k),
        y: my - (my - cur.y) * (newK / cur.k),
        k: newK,
      };
    },
    [pauseAutoFit],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const node = pickNode(sx, sy);
      if (node) {
        pauseAutoFit();
        draggingNodeRef.current = node.id;
        clickStartRef.current = { sx, sy };
      } else {
        pauseAutoFit();
        isPanningRef.current = true;
        panStartRef.current = {
          sx,
          sy,
          viewX: viewRef.current.x,
          viewY: viewRef.current.y,
        };
        clickStartRef.current = { sx, sy };
      }
    },
    [pickNode, pauseAutoFit],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const hovered = pickNode(sx, sy);
      const prevHover = hoverNodeRef.current;
      const nextHover = hovered ? hovered.id : null;
      if (prevHover !== nextHover) {
        hoverNodeRef.current = nextHover;
        canvas.style.cursor = nextHover ? "pointer" : "grab";
      }

      if (draggingNodeRef.current) {
        const view = viewRef.current;
        const world = screenToWorld(sx, sy, view);
        const nodes = nodesRef.current;
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === draggingNodeRef.current) {
            nodes[i].x = world.x;
            nodes[i].y = world.y;
            nodes[i].vx = 0;
            nodes[i].vy = 0;
            break;
          }
        }
        return;
      }

      if (isPanningRef.current) {
        const start = panStartRef.current;
        viewRef.current = {
          x: start.viewX + (sx - start.sx),
          y: start.viewY + (sy - start.sy),
          k: viewRef.current.k,
        };
      }
    },
    [pickNode],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      const dx = sx - clickStartRef.current.sx;
      const dy = sy - clickStartRef.current.sy;
      const isClick = Math.sqrt(dx * dx + dy * dy) < 5;

      if (draggingNodeRef.current && isClick) {
        const node = nodesRef.current.find(
          (n) => n.id === draggingNodeRef.current,
        );
        if (node) onNodeClick?.(node);
      }

      draggingNodeRef.current = null;
      isPanningRef.current = false;
    },
    [onNodeClick],
  );

  const handleMouseLeave = useCallback(() => {
    draggingNodeRef.current = null;
    isPanningRef.current = false;
  }, []);

  const handleDoubleClick = useCallback(() => {
    autoFitRef.current = true;
    const container = containerRef.current;
    if (!container || !nodesRef.current.length) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (!cw || !ch) return;
    viewRef.current = getFitView(nodesRef.current, cw, ch);
  }, []);

  const handleFit = useCallback(() => {
    autoFitRef.current = true;
    const container = containerRef.current;
    if (!container || !nodesRef.current.length) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (!cw || !ch) return;
    viewRef.current = getFitView(nodesRef.current, cw, ch);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setIsFullscreen((prev) => !prev);
      autoFitRef.current = true;
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg)] ${
        isFullscreen ? "w-full h-full" : "w-full h-[480px]"
      }`}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        style={{ touchAction: "none", cursor: "grab" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
      />

      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          onClick={() => {
            pauseAutoFit();
            const v = viewRef.current;
            viewRef.current = { ...v, k: Math.min(v.k * 1.25, 3) };
          }}
          className="w-8 h-8 rounded-lg bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--fg)] flex items-center justify-center text-lg hover:bg-[var(--bg-hover)]"
          title="放大"
        >
          +
        </button>
        <button
          onClick={() => {
            pauseAutoFit();
            const v = viewRef.current;
            viewRef.current = { ...v, k: Math.max(v.k / 1.25, 0.2) };
          }}
          className="w-8 h-8 rounded-lg bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--fg)] flex items-center justify-center text-lg hover:bg-[var(--bg-hover)]"
          title="缩小"
        >
          −
        </button>
        <button
          onClick={handleFit}
          className="w-8 h-8 rounded-lg bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--fg)] flex items-center justify-center text-xs hover:bg-[var(--bg-hover)]"
          title="适配全图"
        >
          ⌖
        </button>
        <button
          onClick={toggleFullscreen}
          className="w-8 h-8 rounded-lg bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--fg)] flex items-center justify-center text-xs hover:bg-[var(--bg-hover)]"
          title={isFullscreen ? "退出全屏" : "全屏"}
        >
          {isFullscreen ? "⛶" : "⛶"}
        </button>
      </div>

      <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none select-none">
        <div className="flex items-center gap-3 text-xs text-[var(--fg-muted)]">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
            <span>普通</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-[#fbbf24]" />
            <span>主要</span>
          </div>
          <span className="opacity-50 ml-1">
            · 共 <span ref={countRef}>0</span> 个角色
          </span>
        </div>
      </div>
    </div>
  );
}
