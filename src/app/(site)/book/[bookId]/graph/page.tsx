"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type {
  GraphData,
  TimelineItem,
  Foreshadowing,
  AnnotationWithLabels,
  CharacterRelation,
} from "@/types/database";
import { useAnnotations } from "@/hooks/useAnnotations";
import ForceGraph from "@/components/graph/ForceGraph";
import TimelineView from "@/components/graph/TimelineView";

const RELATION_TYPES = [
  "宗亲",
  "君臣",
  "同僚",
  "对立",
  "师徒",
  "夫妻",
  "兄弟",
  "其他",
];

export default function GraphPage() {
  const params = useParams();
  const bookId = params.bookId as string;
  const [activeTab, setActiveTab] = useState<
    "graph" | "timeline" | "foreshadowing"
  >("graph");
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [foreshadowingData, setForeshadowingData] = useState<Foreshadowing[]>(
    [],
  );
  const [characterRelations, setCharacterRelations] = useState<
    CharacterRelation[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const { annotations: allAnnotations } = useAnnotations(bookId);

  // 从所有标注中提取角色名（用于下拉框）
  const characterNames = Array.from(
    new Set(
      allAnnotations
        .filter((a) => a.labels?.some((l) => l.name.includes("角色")))
        .map((a) => a.selected_text.trim()),
    ),
  ).filter(Boolean);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (activeTab === "graph") {
          const [graphRes, relRes] = await Promise.all([
            fetch(`/api/books/${bookId}/graph`),
            fetch(`/api/books/${bookId}/character-relations`),
          ]);
          const graphJson = await graphRes.json();
          const relJson = await relRes.json();
          if (graphJson.code === 0) setGraphData(graphJson.data);
          if (relJson.code === 0) setCharacterRelations(relJson.data);
        } else if (activeTab === "timeline") {
          const res = await fetch(`/api/books/${bookId}/timeline`);
          const json = await res.json();
          if (json.code === 0) setTimelineData(json.data);
        } else if (activeTab === "foreshadowing") {
          const res = await fetch(`/api/books/${bookId}/foreshadowing`);
          const json = await res.json();
          if (json.code === 0) setForeshadowingData(json.data);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [activeTab, bookId]);

  // ========== 伏笔：添加回收 ==========
  const handleResolve = async (
    fs: Foreshadowing,
    resolvedAnnotationId: string,
  ) => {
    if (!resolvedAnnotationId) return;
    setResolvingId(fs.id);

    try {
      let realFsId = fs.id;

      if (fs.id.startsWith("auto-")) {
        const createRes = await fetch(`/api/books/${bookId}/foreshadowing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: fs.title,
            planted_annotation_id: fs.planted_annotation?.id,
          }),
        });
        const createJson = await createRes.json();
        if (createJson.code !== 0) {
          alert("创建追踪记录失败");
          return;
        }
        realFsId = createJson.data.id;
      }

      const resolveRes = await fetch(`/api/foreshadowing/${realFsId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved_annotation_id: resolvedAnnotationId }),
      });
      const resolveJson = await resolveRes.json();
      if (resolveJson.code !== 0) {
        alert("添加回收失败");
        return;
      }

      // 刷新
      const refreshRes = await fetch(`/api/books/${bookId}/foreshadowing`);
      const refreshJson = await refreshRes.json();
      if (refreshJson.code === 0) setForeshadowingData(refreshJson.data);
    } finally {
      setResolvingId(null);
    }
  };

  // ========== 角色关系：添加 ==========
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [relSource, setRelSource] = useState("");
  const [relTarget, setRelTarget] = useState("");
  const [relType, setRelType] = useState(RELATION_TYPES[0]);
  const [relDesc, setRelDesc] = useState("");
  const [addingRel, setAddingRel] = useState(false);

  const handleAddRelation = async () => {
    if (!relSource || !relTarget || relSource === relTarget) return;
    setAddingRel(true);
    try {
      const res = await fetch(`/api/books/${bookId}/character-relations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_name: relSource,
          target_name: relTarget,
          relation_type: relType,
          description: relDesc || null,
        }),
      });
      const json = await res.json();
      if (json.code === 0) {
        setShowRelationModal(false);
        setRelSource("");
        setRelTarget("");
        setRelDesc("");
        // 刷新关系列表和图
        const [graphRes, relRes] = await Promise.all([
          fetch(`/api/books/${bookId}/graph`),
          fetch(`/api/books/${bookId}/character-relations`),
        ]);
        const gJson = await graphRes.json();
        const rJson = await relRes.json();
        if (gJson.code === 0) setGraphData(gJson.data);
        if (rJson.code === 0) setCharacterRelations(rJson.data);
      }
    } finally {
      setAddingRel(false);
    }
  };

  const handleDeleteRelation = async (id: string) => {
    if (!confirm("确定删除这条关系？")) return;
    await fetch(`/api/character-relations/${id}`, { method: "DELETE" });
    setCharacterRelations((prev) => prev.filter((r) => r.id !== id));
    const graphRes = await fetch(`/api/books/${bookId}/graph`);
    const gJson = await graphRes.json();
    if (gJson.code === 0) setGraphData(gJson.data);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <header className="sticky top-0 z-40 bg-[var(--bg)]/80 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/book/${bookId}/notes`}
              className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              ← 标注总览
            </Link>
            <h1 className="text-lg font-semibold">关系图谱</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tab 切换 */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "graph" as const, label: "角色关系图" },
            { key: "timeline" as const, label: "剧情时间线" },
            { key: "foreshadowing" as const, label: "伏笔追踪" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-[var(--accent)] text-black"
                  : "bg-[var(--bg-soft)] text-[var(--fg-muted)] border border-[var(--border)] hover:bg-[var(--border)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ========== 角色关系图 ========== */}
            {activeTab === "graph" && (
              <div className="space-y-4">
                <div className="bg-[var(--bg-soft)] rounded-xl border border-[var(--border)] p-4">
                  {graphData.nodes.length > 0 ? (
                    <ForceGraph data={graphData} />
                  ) : (
                    <div className="text-center py-16 text-[var(--fg-muted)]">
                      <p className="text-lg mb-2">暂无角色数据</p>
                      <p className="text-sm">
                        在阅读页为角色名添加「角色」标签
                      </p>
                    </div>
                  )}
                </div>

                {/* 关系管理面板 */}
                <div className="bg-[var(--bg-soft)] rounded-xl border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[var(--fg-muted)]">
                      关系管理
                    </h3>
                    <button
                      onClick={() => setShowRelationModal(true)}
                      className="px-3 py-1.5 text-sm bg-[var(--accent)] text-black rounded-lg hover:opacity-90"
                    >
                      + 添加关系
                    </button>
                  </div>
                  {characterRelations.length === 0 ? (
                    <p className="text-sm text-[var(--fg-muted)]">
                      暂无手动关系，点击上方按钮添加
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {characterRelations.map((rel) => (
                        <div
                          key={rel.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm"
                        >
                          <span className="font-medium">{rel.source_name}</span>
                          <span className="text-[var(--accent)]">
                            — {rel.relation_type} →
                          </span>
                          <span className="font-medium">{rel.target_name}</span>
                          <button
                            onClick={() => handleDeleteRelation(rel.id)}
                            className="ml-1 text-[var(--fg-muted)] hover:text-red-400"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ========== 剧情时间线 ========== */}
            {activeTab === "timeline" && (
              <div className="bg-[var(--bg-soft)] rounded-xl border border-[var(--border)] p-4">
                <TimelineView
                  items={timelineData}
                  onItemClick={(item) => {
                    if (item.chapter_id) {
                      window.location.href = `/book/${bookId}/${item.chapter_id}?offset=${item.start_offset ?? 0}`;
                    }
                  }}
                />
              </div>
            )}

            {/* ========== 伏笔追踪 ========== */}
            {activeTab === "foreshadowing" && (
              <div className="bg-[var(--bg-soft)] rounded-xl border border-[var(--border)] p-4">
                {foreshadowingData.length > 0 ? (
                  <div className="space-y-4">
                    {foreshadowingData.map((fs) => {
                      const isPending = fs.status === "pending";
                      const usedResolvedIds = new Set(
                        (fs.resolved_annotations || []).map((a) => a.id),
                      );

                      return (
                        <div
                          key={fs.id}
                          className="p-4 bg-[var(--bg)] rounded-lg border-l-4 border-[var(--accent)]"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium">{fs.title}</h3>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                isPending
                                  ? "bg-[var(--accent)]/20 text-[var(--accent)]"
                                  : "bg-green-500/20 text-green-400"
                              }`}
                            >
                              {isPending
                                ? "待回收"
                                : `已回收 (${fs.resolved_annotations?.length || 0})`}
                            </span>
                          </div>

                          {fs.planted_annotation && (
                            <p
                              className="text-sm text-[var(--fg-muted)] mb-1 cursor-pointer hover:text-[var(--accent)] transition-colors"
                              onClick={() => {
                                const ann = fs.planted_annotation;
                                if (ann?.chapter_id) {
                                  window.location.href = `/book/${bookId}/${ann.chapter_id}?offset=${ann.start_offset || 0}`;
                                }
                              }}
                            >
                              <span className="font-medium">埋伏：</span>&ldquo;
                              {fs.planted_annotation.selected_text}&rdquo;
                            </p>
                          )}

                          {fs.resolved_annotations &&
                            fs.resolved_annotations.length > 0 && (
                              <div className="space-y-1 mb-2">
                                {fs.resolved_annotations.map((ann, idx) => (
                                  <p
                                    key={ann.id}
                                    className="text-sm text-[var(--fg-muted)] cursor-pointer hover:text-[var(--accent)] transition-colors"
                                    onClick={() => {
                                      if (ann.chapter_id) {
                                        window.location.href = `/book/${bookId}/${ann.chapter_id}?offset=${ann.start_offset || 0}`;
                                      }
                                    }}
                                  >
                                    <span className="font-medium">
                                      回收 {idx + 1}：
                                    </span>
                                    &ldquo;
                                    {ann.selected_text}&rdquo;
                                    <span className="text-xs ml-2 opacity-60">
                                      ({ann.chapter?.title || "未知章节"})
                                    </span>
                                  </p>
                                ))}
                              </div>
                            )}

                          {/* 添加新回收 */}
                          {isPending && (
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-xs text-[var(--fg-muted)] whitespace-nowrap">
                                添加回收：
                              </span>
                              <select
                                disabled={resolvingId === fs.id}
                                className="flex-1 min-w-0 px-2 py-1 text-sm bg-[var(--bg-soft)] border border-[var(--border)] rounded text-[var(--fg)] disabled:opacity-50"
                                defaultValue=""
                                onChange={(e) => {
                                  handleResolve(fs, e.target.value);
                                  e.target.value = "";
                                }}
                              >
                                <option value="" disabled>
                                  {resolvingId === fs.id
                                    ? "处理中..."
                                    : "选择一处标注作为回收..."}
                                </option>
                                {allAnnotations
                                  .filter(
                                    (ann) =>
                                      ann.id !== fs.planted_annotation?.id &&
                                      !usedResolvedIds.has(ann.id),
                                  )
                                  .map((ann) => (
                                    <option key={ann.id} value={ann.id}>
                                      {ann.selected_text.slice(0, 20)}
                                      {ann.selected_text.length > 20
                                        ? "…"
                                        : ""}{" "}
                                      ({ann.chapter?.title || "未知章节"})
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 text-[var(--fg-muted)]">
                    <p className="text-lg mb-2">暂无伏笔记录</p>
                    <p className="text-sm">
                      在阅读页为「伏笔」标签的标注会自动显示在这里
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* 添加关系弹窗 */}
      {showRelationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) =>
            e.target === e.currentTarget && setShowRelationModal(false)
          }
        >
          <div className="w-full max-w-sm bg-[var(--bg)] border border-[var(--border)] rounded-xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">添加角色关系</h3>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-[var(--fg-muted)] mb-1">
                  角色 A
                </label>
                <select
                  value={relSource}
                  onChange={(e) => setRelSource(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg text-[var(--fg)]"
                >
                  <option value="">选择角色</option>
                  {characterNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--fg-muted)] mb-1">
                  关系类型
                </label>
                <select
                  value={relType}
                  onChange={(e) => setRelType(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg text-[var(--fg)]"
                >
                  {RELATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--fg-muted)] mb-1">
                  角色 B
                </label>
                <select
                  value={relTarget}
                  onChange={(e) => setRelTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg text-[var(--fg)]"
                >
                  <option value="">选择角色</option>
                  {characterNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--fg-muted)] mb-1">
                  备注（可选）
                </label>
                <input
                  type="text"
                  value={relDesc}
                  onChange={(e) => setRelDesc(e.target.value)}
                  placeholder="如：李世民之父"
                  className="w-full px-3 py-2 bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg text-[var(--fg)] placeholder:text-[var(--fg-muted)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRelationModal(false)}
                className="px-4 py-2 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
              >
                取消
              </button>
              <button
                onClick={handleAddRelation}
                disabled={
                  addingRel ||
                  !relSource ||
                  !relTarget ||
                  relSource === relTarget
                }
                className="px-4 py-2 text-sm bg-[var(--accent)] text-black rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {addingRel ? "添加中..." : "添加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
