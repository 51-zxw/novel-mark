"use client";
import type { TimelineItem } from "@/types/database";

interface Props {
  items: TimelineItem[];
  onItemClick?: (item: TimelineItem) => void;
}

export default function TimelineView({ items, onItemClick }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center text-neutral-400 py-12">
        <p>暂无剧情标注</p>
        <p className="text-sm mt-1">为「剧情」标签的标注会显示在这里</p>
      </div>
    );
  }
  return (
    <div className="relative py-8">
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-neutral-200 dark:bg-neutral-700 -translate-x-1/2" />
      <div className="space-y-8">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`relative flex items-center ${index % 2 === 0 ? "flex-row" : "flex-row-reverse"}`}
          >
            <div className="w-5/12">
              <div
                className="p-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onItemClick?.(item)}
              >
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
                  {item.title}
                </p>
                <p className="text-xs text-neutral-500">
                  第{item.chapter_order}章 · {item.chapter_title}
                </p>
                <div className="flex gap-1 mt-2">
                  {item.labels.map((label) => (
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
            </div>
            <div className="w-2/12 flex justify-center">
              <div className="w-4 h-4 rounded-full bg-amber-500 border-4 border-white dark:border-neutral-900 z-10" />
            </div>
            <div className="w-5/12" />
          </div>
        ))}
      </div>
    </div>
  );
}
