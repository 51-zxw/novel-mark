// src/hooks/useAnnotations.ts
"use client";

import { useState, useCallback, useEffect } from "react";
import type { AnnotationWithLabels, Label } from "@/types/database";

const API_BASE = "/api";

export function useLabels(bookId: string) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 数据获取直接写在 effect 里，不再通过 useCallback 包装
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/books/${bookId}/labels`);
        if (cancelled) return;
        if (res.status === 401) {
          setLabels([]);
          return;
        }
        const json = await res.json();
        if (!cancelled && json.code === 0) setLabels(json.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    // 🔧 页面重新可见或获得焦点时自动刷新
    const handleVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    const handleFocus = () => load();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [bookId, refreshKey]);

  const createLabel = useCallback(
    async (name: string, color?: string) => {
      const res = await fetch(`${API_BASE}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id: bookId, name, color }),
      });
      if (res.status === 401) return null;
      const json = await res.json();
      if (json.code === 0) {
        // 触发重新获取，而不是直接操作 setLabels
        setRefreshKey((k) => k + 1);
        return json.data as Label;
      }
      return null;
    },
    [bookId],
  );

  const deleteLabel = useCallback(async (labelId: string) => {
    const res = await fetch(`${API_BASE}/labels/${labelId}`, {
      method: "DELETE",
    });
    if (res.status === 401) return;

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { code: 500, message: "Invalid response" };
    }

    if (json.code === 0) setRefreshKey((k) => k + 1);
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { labels, loading, createLabel, deleteLabel, refresh };
}

export function useAnnotations(bookId: string, chapterId?: string) {
  const [annotations, setAnnotations] = useState<AnnotationWithLabels[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        let url = `${API_BASE}/books/${bookId}/annotations`;
        if (chapterId) url += `?chapterId=${chapterId}`;
        const res = await fetch(url);
        if (cancelled) return;
        if (res.status === 401) {
          setAnnotations([]);
          return;
        }
        const json = await res.json();
        if (!cancelled && json.code === 0) setAnnotations(json.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [bookId, chapterId, refreshKey]);

  const createAnnotation = useCallback(
    async (params: {
      chapter_id: string;
      start_offset: number;
      end_offset: number;
      selected_text: string;
      note?: string;
      label_ids: string[];
    }) => {
      const res = await fetch(`${API_BASE}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id: bookId, ...params }),
      });
      if (res.status === 401) return null;
      const json = await res.json();
      if (json.code === 0) {
        setRefreshKey((k) => k + 1);
        return json.data;
      }
      return null;
    },
    [bookId],
  );

  const updateAnnotation = useCallback(
    async (
      annotationId: string,
      params: { note?: string; label_ids?: string[] },
    ) => {
      const res = await fetch(`${API_BASE}/annotations/${annotationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (res.status === 401) return;
      const json = await res.json();
      if (json.code === 0) setRefreshKey((k) => k + 1);
    },
    [],
  );

  const deleteAnnotation = useCallback(async (annotationId: string) => {
    const res = await fetch(`${API_BASE}/annotations/${annotationId}`, {
      method: "DELETE",
    });
    if (res.status === 401) return;
    const json = await res.json();
    if (json.code === 0) setRefreshKey((k) => k + 1);
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return {
    annotations,
    loading,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    refresh,
  };
}
