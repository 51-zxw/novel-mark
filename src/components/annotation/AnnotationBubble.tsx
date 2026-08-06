"use client";
import { useState, useRef, useEffect } from "react";
import type { Label, AnnotationWithLabels } from "@/types/database";
import LabelSelector from "./LabelSelector";

interface Props {
  position: { x: number; y: number };
  selectedText: string;
  labels: Label[];
  existingAnnotation?: AnnotationWithLabels | null;
  onCreateLabel: (name: string, color?: string) => Promise<Label | null>;
  onSave: (params: { label_ids: string[]; note?: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export default function AnnotationBubble({
  position,
  selectedText,
  labels,
  existingAnnotation,
  onCreateLabel,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>(
    existingAnnotation?.labels?.map((l) => l.id) || [],
  );
  const [note, setNote] = useState(existingAnnotation?.note || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node))
        onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // ========== 位置计算：默认右下角，自动边界避让 ==========
  const BUBBLE_WIDTH = 320;
  const BUBBLE_HEIGHT = 300;
  const OFFSET = 12;

  let adjustedX = position.x + OFFSET;
  let adjustedY = position.y + OFFSET;

  if (adjustedX + BUBBLE_WIDTH > window.innerWidth) {
    adjustedX = position.x - BUBBLE_WIDTH - OFFSET;
  }
  if (adjustedY + BUBBLE_HEIGHT > window.innerHeight) {
    adjustedY = position.y - BUBBLE_HEIGHT - OFFSET;
  }
  adjustedX = Math.max(8, adjustedX);
  adjustedY = Math.max(8, adjustedY);

  const handleSave = async () => {
    if (saving || selectedLabelIds.length === 0) return;
    setSaving(true);
    try {
      await onSave({ label_ids: selectedLabelIds, note: note || undefined });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      ref={bubbleRef}
      data-annotation-bubble
      className="fixed z-[100] w-80 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] shadow-2xl p-4"
      style={{
        left: adjustedX,
        top: adjustedY,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="mb-3 p-2 rounded text-sm text-[var(--fg)] line-clamp-2 border-l-2 border-[var(--accent)] bg-[var(--bg-soft)]">
        {selectedText}
      </div>
      <div className="mb-3">
        <LabelSelector
          labels={labels}
          selectedIds={selectedLabelIds}
          onChange={setSelectedLabelIds}
          onCreateLabel={onCreateLabel}
        />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="添加备注（可选）"
        className="w-full px-3 py-2 text-sm rounded-lg resize-none h-20 mb-3 outline-none focus:ring-1 focus:ring-[var(--accent)] bg-[var(--bg-soft)] border border-[var(--border)] text-[var(--fg)] placeholder:text-[var(--fg-muted)]"
      />
      <div className="flex justify-between items-center">
        {existingAnnotation && onDelete ? (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
          >
            {deleting ? "删除中..." : "删除"}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedLabelIds.length === 0}
            className="px-4 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 bg-[var(--accent)] text-black hover:opacity-90"
          >
            {saving ? "保存中..." : existingAnnotation ? "更新" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
