"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Orders" },
  { href: "/lab-tests", label: "Lab Test Catalog" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-b">
      <nav className="mx-auto flex w-full max-w-6xl items-center gap-1 px-6 py-3">
        {NAV_LINKS.map((link) => {
          const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                isActive ? "bg-muted text-foreground" : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
