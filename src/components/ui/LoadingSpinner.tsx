type Props = {
  size?: number; // 像素
  className?: string;
};

/**
 * 通用黄色加载转圈，与前台 loading.tsx 使用相同的双圈样式
 * - 外圈：灰色描边（--border）
 * - 内圈：黄色弧线段（--accent），stroke-dasharray 控制断弧感
 */
export function LoadingSpinner({ size = 24, className = "" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      className={`animate-spin ${className}`}
      aria-hidden="true"
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
