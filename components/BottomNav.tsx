"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS: { href: string; label: string; short?: string }[] = [
  { href: "/board", label: "Today" },
  { href: "/covering", label: "Covering" },
  { href: "/loads/new", label: "New load", short: "New" },
  { href: "/fleet", label: "Fleet" },
  { href: "/setup", label: "Setup" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 -mx-4 mt-10 border-t border-line/80 bg-cream/90 px-3 py-3 backdrop-blur print:hidden sm:-mx-6 sm:px-4 sm:py-4">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 whitespace-nowrap rounded-full px-2 py-2 text-center text-[11px] font-medium leading-none transition sm:flex-1 sm:px-3 sm:py-2.5 sm:text-sm ${
                active ? "bg-teal text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {item.short ? (
                <>
                  <span className="sm:hidden">{item.short}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </>
              ) : (
                item.label
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
