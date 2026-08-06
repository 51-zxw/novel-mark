"use client";

import { useState, Fragment } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLabels, useAnnotations } from "@/hooks/useAnnotations";
import type { Label, AnnotationWithLabels } from "@/types/database";

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

export default function AdminLabelsPage() {
  const params = useParams();
  const bookId = params.id as string;

  const {
    labels,
    loading: labelsLoading,
    createLabel,
    deleteLabel,
  } = useLabels(bookId);
  const { annotations } = useAnnotations(bookId);

  // 新建标签弹窗
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  // 删除标签弹窗
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState<Label | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 展开查看标签下的标注
  const [expandedLabelId, setExpandedLabelId] = useState<string | null>(null);

  // 统计每个标签的标注数量，并收集标注内容
  const labelStats = new Map<
    string,
    { count: number; annotations: AnnotationWithLabels[] }
  >();

  for (const ann of annotations) {
    for (const label of ann.labels || []) {
      const stat = labelStats.get(label.id) || { count: 0, annotations: [] };
      stat.count += 1;
      stat.annotations.push(ann);
      labelStats.set(label.id, stat);
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await createLabel(newName.trim(), newColor);
    setCreating(false);
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
    setShowCreateModal(false);
  };

  const openDeleteModal = (label: Label) => {
    setLabelToDelete(label);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!labelToDelete) return;
    setDeletingId(labelToDelete.id);
    setShowDeleteModal(false);
    await deleteLabel(labelToDelete.id);
    setDeletingId(null);
    setLabelToDelete(null);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
  };

  const toggleExpand = (labelId: string) => {
    setExpandedLabelId((prev) => (prev === labelId ? null : labelId));
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/books"
              className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
            >
              ←
            </Link>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm bg-[var(--accent)] text-black rounded-lg hover:opacity-90"
          >
            + 新建标签
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {labelsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-[var(--bg-soft)] rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-[var(--fg-muted)]">
                    标签
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--fg-muted)]">
                    颜色
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--fg-muted)]">
                    类型
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--fg-muted)]">
                    标注数
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--fg-muted)]">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {labels.map((label) => {
                  const stat = labelStats.get(label.id);
                  const count = stat?.count || 0;
                  const isExpanded = expandedLabelId === label.id;

                  return (
                    <Fragment key={label.id}>
                      <tr
                        className="hover:bg-[var(--bg)] transition-colors cursor-pointer"
                        onClick={() => toggleExpand(label.id)}
                      >
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm"
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded-full border border-[var(--border)]"
                              style={{ backgroundColor: label.color }}
                            />
                            <span className="text-[var(--fg-muted)] text-xs">
                              {label.color}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {label.is_system ? (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                              系统
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--border)] text-[var(--fg-muted)]">
                              自定义
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center justify-center min-w-[1.5rem] px-2 py-0.5 rounded-full text-xs font-medium ${
                              count > 0
                                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                                : "bg-[var(--border)] text-[var(--fg-muted)]"
                            }`}
                          >
                            {count}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!label.is_system && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(label);
                              }}
                              disabled={deletingId === label.id}
                              className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50"
                            >
                              {deletingId === label.id ? "删除中..." : "删除"}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* 展开：显示该标签下的标注内容 */}
                      {isExpanded && count > 0 && (
                        <tr className="bg-[var(--bg)]/50">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="space-y-3">
                              <p className="text-xs font-medium text-[var(--fg-muted)] uppercase tracking-wide">
                                该标签下的标注（{count} 条）
                              </p>
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {stat!.annotations.map((ann) => (
                                  <div
                                    key={ann.id}
                                    className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)]"
                                  >
                                    <p className="text-sm text-[var(--fg)] leading-relaxed line-clamp-3">
                                      <span className="text-[var(--fg-muted)] mr-1"></span>
                                      {ann.selected_text}
                                      <span className="text-[var(--fg-muted)] ml-1"></span>
                                    </p>
                                    {ann.note && (
                                      <p className="mt-1.5 text-xs text-[var(--fg-muted)] italic">
                                        笔记：{ann.note}
                                      </p>
                                    )}
                                    <p className="mt-1 text-xs text-[var(--fg-muted)]/60">
                                      章节：{ann.chapter_id}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {isExpanded && count === 0 && (
                        <tr className="bg-[var(--bg)]/50">
                          <td
                            colSpan={5}
                            className="px-4 py-6 text-center text-sm text-[var(--fg-muted)]"
                          >
                            暂无标注使用该标签
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {labels.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-12 text-center text-[var(--fg-muted)]"
                    >
                      暂无标签
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ========== 新建标签弹窗 ========== */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeCreateModal();
          }}
        >
          <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-base font-semibold">新建标签</h2>
              <button
                onClick={closeCreateModal}
                className="text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--fg)]">
                  标签名称
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="请输入标签名称"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent placeholder:text-[var(--fg-muted)]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !creating) handleCreate();
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--fg)]">
                  标签颜色
                </label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newColor === color
                          ? "border-white ring-2 ring-[var(--accent)] scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="#000000"
                    className="flex-1 px-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--fg-muted)]">
                  预览
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-white text-sm font-medium"
                    style={{
                      backgroundColor: newColor,
                      opacity: newName.trim() ? 1 : 0.5,
                    }}
                  >
                    {newName.trim() || "标签预览"}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-3">
              <button
                onClick={closeCreateModal}
                className="px-4 py-2 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg)] rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="px-4 py-2 text-sm bg-[var(--accent)] text-black rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              >
                {creating ? "创建中..." : "创建"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 删除确认弹窗 ========== */}
      {showDeleteModal && labelToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteModal(false);
              setLabelToDelete(null);
            }
          }}
        >
          <div className="bg-[var(--bg-soft)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 py-5 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-red-500"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
              </div>
              <h3 className="text-base font-semibold mb-1">确定删除此标签？</h3>
              <p className="text-sm text-[var(--fg-muted)]">
                标签「
                <span
                  className="inline-block px-2 py-0.5 rounded text-white text-xs mx-1"
                  style={{ backgroundColor: labelToDelete.color }}
                >
                  {labelToDelete.name}
                </span>
                」将被永久删除，相关标注将失去该标签。
              </p>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setLabelToDelete(null);
                }}
                className="px-4 py-2 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg)] rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingId === labelToDelete.id}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deletingId === labelToDelete.id ? "删除中..." : "确定删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
