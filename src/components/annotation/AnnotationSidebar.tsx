"use client";
import { useState } from "react";
import type { AnnotationWithLabels, Label } from "@/types/database";
import AnnotationBubble from "./AnnotationBubble";

interface Props {
  annotations: AnnotationWithLabels[];
  labels: Label[];
  onCreateLabel: (name: string, color?: string) => Promise<Label | null>;
  onUpdateAnnotation: (
    id: string,
    params: { note?: string; label_ids?: string[] },
  ) => void;
  onDeleteAnnotation: (id: string) => void;
  onNavigate?: (chapterId: string, offset: number) => void;
}

export default function AnnotationSidebar({
  annotations,
  labels,
  onCreateLabel,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onNavigate,
}: Props) {
  const [editingAnnotation, setEditingAnnotation] =
    useState<AnnotationWithLabels | null>(null);
  const [filterLabelId, setFilterLabelId] = useState<string | null>(null);

  const filtered = filterLabelId
    ? annotations.filter((a) => a.labels?.some((l) => l.id === filterLabelId))
    : annotations;
  const groupedByChapter = filtered.reduce(
    (acc, ann) => {
      const chapterTitle = ann.chapter?.title || "未知章节";
      if (!acc[chapterTitle]) acc[chapterTitle] = [];
      acc[chapterTitle].push(ann);
      return acc;
    },
    {} as Record<string, AnnotationWithLabels[]>,
  );

  return (
    <div className="h-full flex flex-col bg-[var(--bg)] border-l border-[var(--border)]">
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="font-semibold text-lg mb-2 text-[var(--fg)]">
          本章标注
        </h3>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFilterLabelId(null)}
            className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
              filterLabelId === null
                ? "bg-[var(--accent)] text-black"
                : "bg-[var(--bg-soft)] text-[var(--fg-muted)]"
            }`}
          >
            全部 ({annotations.length})
          </button>
          {labels.map((label) => {
            const count = annotations.filter((a) =>
              a.labels?.some((l) => l.id === label.id),
            ).length;
            return (
              <button
                key={label.id}
                onClick={() =>
                  setFilterLabelId(label.id === filterLabelId ? null : label.id)
                }
                className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                  filterLabelId === label.id
                    ? "text-white"
                    : "bg-[var(--bg-soft)] text-[var(--fg-muted)]"
                }`}
                style={
                  filterLabelId === label.id
                    ? { backgroundColor: label.color }
                    : {}
                }
              >
                {label.name} ({count})
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.entries(groupedByChapter).map(([chapterTitle, anns]) => (
          <div key={chapterTitle}>
            <h4 className="text-xs font-medium text-[var(--fg-muted)] mb-2 sticky top-0 bg-[var(--bg)] py-1">
              {chapterTitle}
            </h4>
            <div className="space-y-2">
              {anns.map((ann) => (
                <div
                  key={ann.id}
                  className="p-3 bg-[var(--bg-soft)] rounded-lg cursor-pointer hover:bg-[var(--border)] transition-colors"
                  onClick={() => {
                    if (onNavigate)
                      onNavigate(ann.chapter_id, ann.start_offset);
                    else setEditingAnnotation(ann);
                  }}
                >
                  <p className="text-sm text-[var(--fg)] line-clamp-2 mb-1">
                    {ann.selected_text}
                  </p>
                  {ann.note && (
                    <p className="text-xs text-[var(--fg-muted)] mb-1">
                      {ann.note}
                    </p>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    {ann.labels?.map((label) => (
                      <span
                        key={label.id}
                        className="px-1.5 py-0.5 text-xs rounded text-white"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-[var(--fg-muted)] py-8">
            <p>暂无标注</p>
            <p className="text-xs mt-1">选中文本即可添加标注</p>
          </div>
        )}
      </div>
      {editingAnnotation && (
        <AnnotationBubble
          position={{
            x: window.innerWidth / 2 - 160,
            y: window.innerHeight / 2,
          }}
          selectedText={editingAnnotation.selected_text}
          labels={labels}
          existingAnnotation={editingAnnotation}
          onCreateLabel={onCreateLabel}
          onSave={async (params) => {
            onUpdateAnnotation(editingAnnotation.id, params);
            setEditingAnnotation(null);
          }}
          onDelete={async () => {
            onDeleteAnnotation(editingAnnotation.id);
            setEditingAnnotation(null);
          }}
          onClose={() => setEditingAnnotation(null)}
        />
      )}
    </div>
  );
}
