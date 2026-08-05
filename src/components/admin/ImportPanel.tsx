"use client";

import { useState, useEffect, useCallback } from "react";
import {
  VOLUME_PATTERNS,
  CHAPTER_PATTERNS,
  SECTION_PATTERNS,
  parseTxt,
  type ParsedNode,
} from "@/lib/import/parser";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type Props = {
  bookId: string;
  bookTitle: string;
  targetVolumeId?: string | null;
  onClose: () => void;
  onImported: () => void;
};

type Preview = {
  nodes: ParsedNode[];
  counts: { volumes: number; chapters: number; sections: number };
  warnings: string[];
};

type Mode = "batch" | "single";
type SingleSource = "file" | "text";

// 使用 XMLHttpRequest 实现带进度的上传
function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (loaded: number, total: number) => void
): Promise<{ ok: boolean; status: number; body: any }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(e.loaded, e.total);
      }
    };

    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body });
      } catch {
        resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body: { error: "响应解析失败" } });
      }
    };

    xhr.onerror = () => {
      resolve({ ok: false, status: 0, body: { error: "网络错误" } });
    };

    xhr.onabort = () => {
      resolve({ ok: false, status: 0, body: { error: "上传已取消" } });
    };

    xhr.send(formData);
  });
}

export function ImportPanel({ bookId, targetVolumeId, onClose, onImported }: Props) {
  const [mode, setMode] = useState<Mode>("batch");

  const [volPattern, setVolPattern] = useState<string>(VOLUME_PATTERNS[0].value);
  const [chPattern, setChPattern] = useState<string>(CHAPTER_PATTERNS[0].value);
  const [secPattern, setSecPattern] = useState<string>(SECTION_PATTERNS[0].value);

  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchFileName, setBatchFileName] = useState("");
  const [batchPreview, setBatchPreview] = useState<Preview | null>(null);

  const [singleSource, setSingleSource] = useState<SingleSource>("file");
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singleFileName, setSingleFileName] = useState("");
  const [singleTitle, setSingleTitle] = useState("");
  const [singleContent, setSingleContent] = useState("");

  const [importing, setImporting] = useState(false);
  const [importPhase, setImportPhase] = useState<string>("");
  const [importProgress, setImportProgress] = useState<number>(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (batchFile) reparseBatch();
  }, [batchFile]);

  function reparseBatch() {
    if (!batchFile) return;
    batchFile
      .text()
      .then((text) => {
        try {
          const result = parseTxt(text, volPattern, chPattern, secPattern);
          setBatchPreview({
            nodes: result.nodes,
            counts: result.counts,
            warnings: result.warnings,
          });
          setError("");
        } catch (err) {
          setError(err instanceof Error ? err.message : "解析失败");
          setBatchPreview(null);
        }
      })
      .catch(() => setError("文件读取失败"));
  }

  useEffect(() => {
    if (mode === "batch" && batchFile) reparseBatch();
  }, [volPattern, chPattern, secPattern, mode]); // eslint-disable-line

  const handleBatchImport = useCallback(async () => {
    if (!batchFile) return;
    setImporting(true);
    setError("");
    setImportProgress(0);
    setImportPhase("正在上传文件...");

    try {
      const form = new FormData();
      form.append("file", batchFile);
      form.append("volumePattern", volPattern);
      form.append("chapterPattern", chPattern);
      form.append("sectionPattern", secPattern);

      const result = await uploadWithProgress(
        `/api/admin/import/${bookId}`,
        form,
        (loaded, total) => {
          const pct = Math.round((loaded / total) * 50);
          setImportProgress(pct);
        }
      );

      if (!result.ok) {
        setError(result.body.error || "导入失败");
        setImporting(false);
        return;
      }

      setImportPhase("正在写入数据库...");
      setImportProgress(75);
      await new Promise((r) => setTimeout(r, 300));

      setImportProgress(100);
      setImportPhase("导入完成！");

      setTimeout(() => {
        onImported();
        onClose();
      }, 500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败");
      setImporting(false);
    }
  }, [batchFile, volPattern, chPattern, secPattern, bookId, onImported, onClose]);

  const handleSingleImport = useCallback(async () => {
    let form = new FormData();
    let url = `/api/admin/import/${bookId}/single`;

    if (singleSource === "file") {
      if (!singleFile) return;
      setImporting(true);
      setError("");
      setImportProgress(0);
      setImportPhase("正在上传文件...");

      form.append("file", singleFile);
      form.append("title", singleTitle || singleFileName.replace(/\.txt$/i, ""));
      if (targetVolumeId) form.append("volumeId", targetVolumeId);

      try {
        const result = await uploadWithProgress(url, form, (loaded, total) => {
          const pct = Math.round((loaded / total) * 60);
          setImportProgress(pct);
        });

        if (!result.ok) {
          setError(result.body.error || "导入失败");
          setImporting(false);
          return;
        }

        setImportProgress(100);
        setImportPhase("导入完成！");
        setTimeout(() => {
          onImported();
          onClose();
        }, 400);
      } catch (e) {
        setError(e instanceof Error ? e.message : "导入失败");
        setImporting(false);
      }
    } else {
      if (!singleContent.trim()) {
        setError("请输入正文内容");
        return;
      }
      if (!singleTitle.trim()) {
        setError("请填写章节标题");
        return;
      }
      setImporting(true);
      setError("");
      setImportProgress(0);
      setImportPhase("正在提交...");

      form.append("title", singleTitle);
      form.append("content", singleContent);
      if (targetVolumeId) form.append("volumeId", targetVolumeId);

      try {
        const result = await uploadWithProgress(url, form, () => {
          setImportProgress(70);
        });

        if (!result.ok) {
          setError(result.body.error || "导入失败");
          setImporting(false);
          return;
        }

        setImportProgress(100);
        setImportPhase("导入完成！");
        setTimeout(() => {
          onImported();
          onClose();
        }, 400);
      } catch (e) {
        setError(e instanceof Error ? e.message : "导入失败");
        setImporting(false);
      }
    }
  }, [singleSource, singleFile, singleFileName, singleTitle, singleContent, bookId, targetVolumeId, onImported, onClose]);

  return (
    <>
      {/* 全局 loading 蒙层 */}
      {importing && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--bg)]/85 backdrop-blur-sm">
          <LoadingSpinner size={56} />
          <p className="mt-5 text-base text-[var(--fg)]">{importPhase}</p>
          <div className="mt-3 h-1.5 w-64 overflow-hidden rounded-full bg-[var(--bg-soft)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300 ease-out"
              style={{ width: `${importProgress}%` }}
            />
          </div>
          <p className="mt-2 text-sm font-mono text-[var(--fg-muted)]">{importProgress}%</p>
          <p className="mt-1 text-xs text-[var(--fg-muted)]/70">请勿关闭页面</p>
        </div>
      )}

      {/* 弹窗本体 */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 ${importing ? "pointer-events-none opacity-60" : ""}`}>
        <div className="scrollbar-beautiful w-full max-w-2xl max-h-[90vh] overflow-auto rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
            <div className="font-serif text-base">导入章节</div>
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="rounded-md p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--fg)] transition-all active:scale-95 disabled:opacity-40"
              aria-label="关闭"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Tab 切换 */}
          <div className="px-5 pt-3">
            <div className="flex gap-1 border-b border-[var(--border)]">
              {(["batch", "single"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError("");
                  }}
                  disabled={importing}
                  className={`px-4 py-2 text-sm transition-colors disabled:opacity-50 ${
                    mode === m
                      ? "text-[var(--accent)] border-b-2 border-[var(--accent)]"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {m === "batch" ? "批量导入" : "单节导入"}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-4">
            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                {error}
              </div>
            )}

            {mode === "batch" ? (
              <BatchMode
                volPattern={volPattern} setVolPattern={setVolPattern}
                chPattern={chPattern} setChPattern={setChPattern}
                secPattern={secPattern} setSecPattern={setSecPattern}
                batchFile={batchFile} setBatchFile={setBatchFile}
                batchFileName={batchFileName} setBatchFileName={setBatchFileName}
                batchPreview={batchPreview}
                importing={importing}
                onImport={handleBatchImport}
                onReparse={reparseBatch}
              />
            ) : (
              <SingleMode
                singleSource={singleSource} setSingleSource={setSingleSource}
                singleFile={singleFile} setSingleFile={setSingleFile}
                singleFileName={singleFileName} setSingleFileName={setSingleFileName}
                singleTitle={singleTitle} setSingleTitle={setSingleTitle}
                singleContent={singleContent} setSingleContent={setSingleContent}
                importing={importing}
                onImport={handleSingleImport}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ========== 批量导入模式 ========== */

type BatchModeProps = {
  volPattern: string; setVolPattern: (v: string) => void;
  chPattern: string; setChPattern: (v: string) => void;
  secPattern: string; setSecPattern: (v: string) => void;
  batchFile: File | null; setBatchFile: (f: File | null) => void;
  batchFileName: string; setBatchFileName: (s: string) => void;
  batchPreview: Preview | null;
  importing: boolean;
  onImport: () => void;
  onReparse: () => void;
};

function BatchMode(p: BatchModeProps) {
  return (
    <>
      {/* 格式正则 */}
      <div>
        <div className="text-xs text-[var(--fg-muted)] mb-2">① 标题格式正则（可直接修改）</div>
        <div className="space-y-2">
          <PatternInput label="卷" value={p.volPattern} presetOptions={VOLUME_PATTERNS} onChange={p.setVolPattern} disabled={p.importing} />
          <PatternInput label="章" value={p.chPattern} presetOptions={CHAPTER_PATTERNS} onChange={p.setChPattern} disabled={p.importing} />
          <PatternInput label="节" value={p.secPattern} presetOptions={SECTION_PATTERNS} onChange={p.setSecPattern} disabled={p.importing} />
        </div>
        <div className="mt-1 text-xs text-[var(--fg-muted)]">
          留空表示该层不存在；可选"无卷/无章/无节"预设。
        </div>
      </div>

      {/* 选文件 */}
      <div>
        <div className="text-xs text-[var(--fg-muted)] mb-2">② 选择 TXT 文件</div>
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_0_2px_rgba(200,155,8,0.25)] active:scale-[0.98] ${p.importing ? "pointer-events-none opacity-60" : ""}`}>
          <span>{p.batchFileName ? "重新选择" : "选择文件"}</span>
          <input
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            disabled={p.importing}
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              p.setBatchFile(f);
              p.setBatchFileName(f?.name || "");
            }}
          />
        </label>
        {p.batchFileName && (
          <span className="ml-3 text-xs text-[var(--fg-muted)]">{p.batchFileName}</span>
        )}
      </div>

      {/* 预览 */}
      {p.batchPreview && (
        <div>
          <div className="text-xs text-[var(--fg-muted)] mb-2">③ 解析预览</div>
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-soft)] p-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>卷：<b className="text-[var(--accent)]">{p.batchPreview.counts.volumes}</b></span>
              <span>章：<b className="text-[var(--accent)]">{p.batchPreview.counts.chapters}</b></span>
              <span>节：<b className="text-[var(--accent)]">{p.batchPreview.counts.sections}</b></span>
            </div>
            {p.batchPreview.warnings.length > 0 && (
              <ul className="mt-2 text-xs text-yellow-600 list-disc pl-4 space-y-0.5">
                {p.batchPreview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
            <div className="scrollbar-beautiful mt-3 max-h-48 overflow-auto pr-2 text-xs space-y-1">
              {flattenPreview(p.batchPreview.nodes).slice(0, 15).map((item, i) => (
                <div key={i} className="text-[var(--fg-muted)] leading-relaxed">
                  <span className="mr-2">{item.type === "volume" ? "📚" : item.type === "chapter" ? "📖" : "📄"}</span>
                  {item.title}
                  {item.type === "section" && (
                    <span className="ml-2 text-[var(--fg-muted)]">({item.wordCount}字)</span>
                  )}
                </div>
              ))}
              {flattenPreview(p.batchPreview.nodes).length > 15 && (
                <div className="text-[var(--fg-muted)]">
                  ...还有 {flattenPreview(p.batchPreview.nodes).length - 15} 条
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 确认导入 */}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        <div className="text-xs text-[var(--fg-muted)]">
          导入是追加到当前书，不会删除已有数据
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={p.onImport}
            disabled={!p.batchPreview || p.importing}
            className="rounded-md bg-[var(--accent)] px-5 py-2 text-sm font-medium text-black inline-flex items-center gap-2 transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_0_2px_rgba(200,155,8,0.25)] active:scale-[0.98] disabled:opacity-50"
          >
            {p.importing && <LoadingSpinner size={14} className="text-black/70" />}
            <span>{p.importing ? "导入中" : "确认导入"}</span>
          </button>
        </div>
      </div>
    </>
  );
}

/* ========== 单节导入模式 ========== */

type SingleModeProps = {
  singleSource: SingleSource; setSingleSource: (s: SingleSource) => void;
  singleFile: File | null; setSingleFile: (f: File | null) => void;
  singleFileName: string; setSingleFileName: (s: string) => void;
  singleTitle: string; setSingleTitle: (s: string) => void;
  singleContent: string; setSingleContent: (s: string) => void;
  importing: boolean;
  onImport: () => void;
};

function SingleMode(p: SingleModeProps) {
  return (
    <>
      <div>
        <div className="text-xs text-[var(--fg-muted)] mb-2">选择来源</div>
        <div className="flex gap-2">
          {(["file", "text"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => p.setSingleSource(s)}
              disabled={p.importing}
              className={`rounded-md px-3 py-1.5 text-sm transition-all duration-150 disabled:opacity-50 ${
                p.singleSource === s
                  ? "bg-[var(--accent)] text-black"
                  : "border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-card)]"
              }`}
            >
              {s === "file" ? "TXT 文件" : "直接输入文本"}
            </button>
          ))}
        </div>
      </div>

      {p.singleSource === "file" ? (
        <div>
          <div className="text-xs text-[var(--fg-muted)] mb-2">选择 TXT 文件</div>
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_0_2px_rgba(200,155,8,0.25)] active:scale-[0.98] ${p.importing ? "pointer-events-none opacity-60" : ""}`}>
            <span>{p.singleFileName ? "重新选择" : "选择文件"}</span>
            <input
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              disabled={p.importing}
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                p.setSingleFile(f);
                p.setSingleFileName(f?.name || "");
                if (f) {
                  p.setSingleTitle(f.name.replace(/\.txt$/i, ""));
                }
              }}
            />
          </label>
          {p.singleFileName && (
            <span className="ml-3 text-xs text-[var(--fg-muted)]">{p.singleFileName}</span>
          )}
        </div>
      ) : (
        <div>
          <div className="text-xs text-[var(--fg-muted)] mb-2">粘贴正文内容</div>
          <textarea
            value={p.singleContent}
            onChange={(e) => p.setSingleContent(e.target.value)}
            rows={8}
            placeholder="在此粘贴正文内容..."
            disabled={p.importing}
            className="scrollbar-beautiful w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm transition-all duration-150 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/40 focus:outline-none hover:border-[var(--border)]/80 resize-y disabled:opacity-50"
          />
          <div className="mt-1 text-xs text-[var(--fg-muted)]">
            {p.singleContent.replace(/\s/g, "").toLocaleString()} 字
          </div>
        </div>
      )}

      <div>
        <div className="text-xs text-[var(--fg-muted)] mb-2">章节标题</div>
        <input
          type="text"
          value={p.singleTitle}
          onChange={(e) => p.setSingleTitle(e.target.value)}
          placeholder="留空则用文件名 / 正文首行作为标题"
          disabled={p.importing}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm transition-all duration-150 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/40 focus:outline-none hover:border-[var(--border)]/80 disabled:opacity-50"
        />
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        <div className="text-xs text-[var(--fg-muted)]">
          导入是追加到当前书，不会删除已有数据
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={p.onImport}
            disabled={p.importing}
            className="rounded-md bg-[var(--accent)] px-5 py-2 text-sm font-medium text-black inline-flex items-center gap-2 transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_0_2px_rgba(200,155,8,0.25)] active:scale-[0.98] disabled:opacity-50"
          >
            {p.importing && <LoadingSpinner size={14} className="text-black/70" />}
            <span>{p.importing ? "导入中" : "确认导入"}</span>
          </button>
        </div>
      </div>
    </>
  );
}

/* ========== 子组件 ========== */

function PatternInput({
  label,
  value,
  presetOptions,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  presetOptions: readonly { label: string; value: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${disabled ? "opacity-50" : ""}`}>
      <label className="text-xs text-[var(--fg-muted)] w-8 shrink-0">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="正则，留空=无此层"
        disabled={disabled}
        className="flex-1 min-w-0 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs font-mono transition-all duration-150 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/40 focus:outline-none hover:border-[var(--border)]/80 disabled:cursor-not-allowed"
      />
      <select
        value={presetOptions.findIndex((p) => p.value === value)}
        onChange={(e) => {
          const idx = Number(e.target.value);
          if (idx >= 0) onChange(presetOptions[idx].value);
        }}
        disabled={disabled}
        className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-xs transition-all duration-150 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/40 focus:outline-none hover:border-[var(--border)]/80 cursor-pointer disabled:cursor-not-allowed"
      >
        <option value={-1}>预设▼</option>
        {presetOptions.map((p, i) => (
          <option key={i} value={i}>{p.label}</option>
        ))}
      </select>
    </div>
  );
}

function flattenPreview(
  nodes: ParsedNode[],
  depth = 0
): { type: ParsedNode["type"]; title: string; wordCount: number; depth: number }[] {
  const out: { type: ParsedNode["type"]; title: string; wordCount: number; depth: number }[] = [];
  for (const n of nodes) {
    out.push({ type: n.type, title: "  ".repeat(depth) + n.title, wordCount: n.wordCount, depth });
    if (n.children.length > 0) {
      out.push(...flattenPreview(n.children, depth + 1));
    }
  }
  return out;
}
