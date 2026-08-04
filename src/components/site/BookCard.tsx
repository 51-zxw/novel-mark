import Link from "next/link";
import type { Book } from "@/types/database";

export function BookCard({ book }: { book: Book }) {
  return (
    <Link
      href={`/book/${book.id}`}
      className="group flex flex-col gap-1"
    >
      <div className="aspect-[3/4] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-card)]">
        {book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.cover_url}
            alt={book.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center font-serif text-xs text-[var(--fg-muted)]">
            {book.title.slice(0, 2)}
          </div>
        )}
      </div>
      <div className="space-y-0">
        <div className="truncate text-xs font-medium leading-tight">{book.title}</div>
        <div className="truncate text-[10px] text-[var(--fg-muted)] leading-tight">{book.author}</div>
      </div>
    </Link>
  );
}
