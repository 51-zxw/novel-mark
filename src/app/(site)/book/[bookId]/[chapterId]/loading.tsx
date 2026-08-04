export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl min-h-[60vh] flex flex-col items-center justify-center">
      <Spinner />
      <p className="mt-4 text-sm text-[var(--fg-muted)]">加载中...</p>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-10 w-10 animate-spin"
      viewBox="0 0 50 50"
      fill="none"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        stroke="var(--border)"
        strokeWidth="3"
        fill="none"
      />
      <circle
        cx="25"
        cy="25"
        r="20"
        stroke="var(--accent)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="60 126"
      />
    </svg>
  );
}
