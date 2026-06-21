"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard", match: (p: string) => p === "/" },
  {
    href: "/proposals",
    label: "Review queue",
    match: (p: string) => p === "/proposals" || p.startsWith("/proposals/"),
  },
  { href: "/activity", label: "Activity", match: (p: string) => p === "/activity" },
] as const;

export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-12 w-full max-w-5xl items-center justify-between gap-6 px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium tracking-tight">
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Self-Healing Content System
        </Link>
        <ul className="flex items-center gap-1 text-sm">
          {LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs transition-colors",
                    active
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
