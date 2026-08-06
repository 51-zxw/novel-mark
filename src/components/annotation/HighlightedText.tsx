"use client";
import { useMemo, useCallback } from "react";
import type { AnnotationWithLabels } from "@/types/database";

interface Props {
  content: string;
  annotations: AnnotationWithLabels[];
  onAnnotationClick?: (annotation: AnnotationWithLabels) => void;
}

interface Segment {
  text: string;
  annotation?: AnnotationWithLabels;
  isHighlight: boolean;
}

export default function HighlightedText({
  content,
  annotations,
  onAnnotationClick,
}: Props) {
  const sortedAnnotations = useMemo(
    () => [...annotations].sort((a, b) => a.start_offset - b.start_offset),
    [annotations],
  );

  const segments = useMemo(() => {
    const result: Segment[] = [];
    let currentPos = 0;
    for (const ann of sortedAnnotations) {
      if (ann.start_offset > currentPos) {
        result.push({
          text: content.slice(currentPos, ann.start_offset),
          isHighlight: false,
        });
      }
      result.push({
        text: content.slice(ann.start_offset, ann.end_offset),
        annotation: ann,
        isHighlight: true,
      });
      currentPos = ann.end_offset;
    }
    if (currentPos < content.length)
      result.push({ text: content.slice(currentPos), isHighlight: false });
    if (result.length === 0 && content)
      result.push({ text: content, isHighlight: false });
    return result;
  }, [content, sortedAnnotations]);

  const handleClick = useCallback(
    (ann: AnnotationWithLabels) => {
      onAnnotationClick?.(ann);
    },
    [onAnnotationClick],
  );

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.isHighlight && segment.annotation) {
          const primaryLabel = segment.annotation.labels?.[0];
          const bgColor = primaryLabel?.color || "#c8a165";
          return (
            <mark
              key={`h-${index}`}
              className="cursor-pointer rounded px-0.5 py-0.5 transition-opacity hover:opacity-80"
              style={{
                backgroundColor: `${bgColor}30`,
                borderBottom: `2px solid ${bgColor}`,
                color: "inherit",
              }}
              onClick={() => handleClick(segment.annotation!)}
              title={
                segment.annotation.note ||
                segment.annotation.labels?.map((l) => l.name).join(", ")
              }
            >
              {segment.text}
            </mark>
          );
        }
        return <span key={`t-${index}`}>{segment.text}</span>;
      })}
    </>
  );
}
