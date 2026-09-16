"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/board", label: "Today" },
  { href: "/covering", label: "Covering" },
  { href: "/loads/new", label: "New load" },
  { href: "/fleet", label: "Fleet" },
  { href: "/setup", label: "Setup" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 -mx-4 mt-10 border-t border-line/80 bg-cream/90 px-4 py-4 backdrop-blur print:hidden sm:-mx-6">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-1 sm:gap-2">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 rounded-full px-1.5 py-2.5 text-center text-xs font-medium transition sm:px-3 sm:text-sm ${
                active ? "bg-teal text-white" : "text-ink-muted hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
