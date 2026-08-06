"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { AnnotationWithLabels, Label } from "@/types/database";
import { useLabels, useAnnotations } from "@/hooks/useAnnotations";
import AnnotationBubble from "@/components/annotation/AnnotationBubble";

export default function NotesPage() {
  const params = useParams();
  const bookId = params.bookId as string;
  const [viewMode, setViewMode] = useState<"label" | "chapter" | "time">(
    "label",
  );
  const [editingAnnotation, setEditingAnnotation] =
    useState<AnnotationWithLabels | null>(null);
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });

  // 删除标签 loading
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 新建标签弹窗
  const [showModal, setShowModal] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#c8a165");
  const [creating, setCreating] = useState(false);

  const { labels, createLabel, deleteLabel } = useLabels(bookId);
  const { annotations, updateAnnotation, deleteAnnotation } =
    useAnnotations(bookId);

  const PRESET_COLORS = [
    "#c8a165",
    "#e74c3c",
    "#3498db",
    "#2ecc71",
    "#9b59b6",
    "#f39c12",
    "#1abc9c",
    "#e91e63",
  ];

  const handleDeleteLabel = async (labelId: string) => {
    setDeletingId(labelId);
    await deleteLabel(labelId);
    setDeletingId(null);
  };

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    setCreating(true);
    await createLabel(newLabelName.trim(), newLabelColor);
    setCreating(false);
    setNewLabelName("");
    setNewLabelColor("#c8a165");
    setShowModal(false);
  };

  type Group = {
    title: string;
    items: AnnotationWithLabels[];
    label?: Label;
  };

  const groupedData = (): Group[] => {
    switch (viewMode) {
      case "label": {
        const map: Record<string, Group> = {};
        for (const label of labels) {
          map[label.id] = {
            title: label.name,
            label,
            items: [],
          };
        }
        for (const ann of annotations) {
          for (const label of ann.labels || []) {
            if (map[label.id]) map[label.id].items.push(ann);
          }
        }
        return Object.values(map).filter((g) => g.items.length > 0);
      }
      case "chapter": {
        const map: Record<string, Group> = {};
        for (const ann of annotations) {
          const title = ann.chapter?.title || "未知章节";
          if (!map[title]) map[title] = { title, items: [] };
          map[title].items.push(ann);
        }
        return Object.values(map);
      }
      case "time":
        return [
          {
            title: "按时间排序",
            items: [...annotations].sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            ),
          },
        ];
      default:
        return [];
    }
  };

  const handleEdit = (ann: AnnotationWithLabels, e: React.MouseEvent) => {
    setBubblePosition({ x: e.clientX, y: e.clientY });
    setEditingAnnotation(ann);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg)]/80 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/book/${bookId}`}
              className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
            >
              ← 返回目录
            </Link>
            <h1 className="text-lg font-semibold">标注总览</h1>
          </div>
          <Link
            href={`/book/${bookId}/graph`}
            className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--border)] transition-colors"
          >
            关系图
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* 视图切换 */}
        <div className="flex gap-2 mb-6">
          {(["label", "chapter", "time"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === mode
                  ? "bg-[var(--accent)] text-black"
                  : "bg-[var(--bg-soft)] text-[var(--fg-muted)] border border-[var(--border)] hover:bg-[var(--border)]"
              }`}
            >
              {mode === "label" && "标签视图"}
              {mode === "chapter" && "章节视图"}
              {mode === "time" && "时间视图"}
            </button>
          ))}
        </div>

        {/* 标签管理 */}
        <div className="mb-8 p-4 bg-[var(--bg-soft)] rounded-xl border border-[var(--border)]">
          <h3 className="text-sm font-medium mb-3 text-[var(--fg-muted)]">
            标签管理
          </h3>
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-sm text-white transition-opacity"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
                {!label.is_system && (
                  <button
                    onClick={() => handleDeleteLabel(label.id)}
                    disabled={deletingId === label.id}
                    className="ml-1 text-white/70 hover:text-white disabled:opacity-50"
                  >
                    {deletingId === label.id ? (
                      <svg
                        className="w-3 h-3 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      "×"
                    )}
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1 text-sm text-[var(--accent)] border border-[var(--accent)] rounded-full hover:bg-[var(--accent)]/10 transition-colors"
            >
              + 新建标签
            </button>
          </div>
        </div>

        {/* 标注列表 */}
        <div className="space-y-6">
          {groupedData().map((group) => (
            <div key={group.title}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                {viewMode === "label" && group.label && (
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.label.color || "#999" }}
                  />
                )}
                {group.title}
                <span className="text-sm font-normal text-[var(--fg-muted)]">
                  ({group.items.length})
                </span>
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-4 bg-[var(--bg-soft)] rounded-xl border border-[var(--border)] hover:shadow-md transition-shadow cursor-pointer"
                    onClick={(e) => handleEdit(ann, e)}
                  >
                    <p className="text-sm text-[var(--fg)] mb-2 line-clamp-2">
                      &ldquo;{ann.selected_text}&rdquo;
                    </p>
                    {ann.note && (
                      <p className="text-xs text-[var(--fg-muted)] mb-2">
                        {ann.note}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 flex-wrap">
                        {ann.labels?.map((l) => (
                          <span
                            key={l.id}
                            className="px-1.5 py-0.5 text-xs rounded text-white"
                            style={{ backgroundColor: l.color }}
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-[var(--fg-muted)]">
                        {ann.chapter?.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {annotations.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[var(--fg-muted)] text-lg">还没有任何标注</p>
              <p className="text-[var(--fg-muted)] text-sm mt-2">
                在阅读页选中文本，即可添加标注
              </p>
              <Link
                href={`/book/${bookId}`}
                className="inline-block mt-4 px-6 py-2 bg-[var(--accent)] text-black rounded-lg hover:opacity-90 transition-opacity"
              >
                去阅读
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* 新建标签弹窗 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="w-full max-w-sm bg-[var(--bg)] border border-[var(--border)] rounded-xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4">新建标签</h3>
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="标签名称"
              className="w-full px-3 py-2 mb-4 bg-[var(--bg-soft)] border border-[var(--border)] rounded-lg text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateLabel()}
            />
            <div className="flex gap-2 mb-6 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewLabelColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    newLabelColor === c
                      ? "border-[var(--fg)] scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateLabel}
                disabled={creating || !newLabelName.trim()}
                className="px-4 py-2 text-sm bg-[var(--accent)] text-black rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {creating ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑标注气泡 */}
      {editingAnnotation && (
        <AnnotationBubble
          position={bubblePosition}
          selectedText={editingAnnotation.selected_text}
          labels={labels}
          existingAnnotation={editingAnnotation}
          onCreateLabel={createLabel}
          onSave={async (params) => {
            updateAnnotation(editingAnnotation.id, params);
            setEditingAnnotation(null);
          }}
          onDelete={async () => {
            deleteAnnotation(editingAnnotation.id);
            setEditingAnnotation(null);
          }}
          onClose={() => setEditingAnnotation(null)}
        />
      )}
    </div>
  );
}
