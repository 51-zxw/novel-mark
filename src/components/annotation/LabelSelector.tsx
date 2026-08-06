"use client";
import { useState } from "react";
import type { Label } from "@/types/database";

interface Props {
  labels: Label[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreateLabel: (name: string, color?: string) => Promise<Label | null>;
}

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

export default function LabelSelector({
  labels,
  selectedIds,
  onChange,
  onCreateLabel,
}: Props) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const toggleLabel = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((sid) => sid !== id)
        : [...selectedIds, id],
    );
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const label = await onCreateLabel(newName.trim(), newColor);
    if (label) {
      onChange([...selectedIds, label.id]);
      setNewName("");
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => (
          <button
            key={label.id}
            onClick={() => toggleLabel(label.id)}
            className={`px-3 py-1 rounded-full text-sm border transition-all ${
              selectedIds.includes(label.id)
                ? "text-white border-transparent"
                : "bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600"
            }`}
            style={
              selectedIds.includes(label.id)
                ? { backgroundColor: label.color }
                : {}
            }
          >
            {label.name}
          </button>
        ))}
      </div>
      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          className="text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400"
        >
          + 新建标签
        </button>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="标签名称"
            className="flex-1 px-2 py-1 text-sm bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <div className="flex gap-1">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-5 h-5 rounded-full border-2 ${newColor === c ? "border-neutral-800 dark:border-white" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <button
            onClick={handleCreate}
            className="px-3 py-1 text-sm bg-amber-600 text-white rounded hover:bg-amber-700"
          >
            创建
          </button>
          <button
            onClick={() => {
              setIsCreating(false);
              setNewName("");
            }}
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
}
