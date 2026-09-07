"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/board", label: "Board" },
  { href: "/loads/new", label: "Load" },
  { href: "/fleet", label: "Fleet" },
  { href: "/audit", label: "Audit" },
  { href: "/setup", label: "Setup" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 -mx-4 mt-8 border-t border-line bg-cream/90 px-3 py-3 backdrop-blur sm:-mx-6">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-1">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href === "/board" && pathname.startsWith("/loads/") && pathname !== "/loads/new");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 rounded-full px-2 py-2 text-center text-sm font-semibold transition ${
                active ? "bg-teal text-white shadow-sm" : "text-ink-muted hover:bg-white hover:text-ink"
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
