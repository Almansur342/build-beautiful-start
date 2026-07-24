import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  about: "About",
  careers: "Careers",
  changelog: "Changelog",
  docs: "Docs",
  contact: "Contact",
  blog: "Blog",
  legal: "Legal",
  privacy: "Privacy",
  terms: "Terms",
  refund: "Refund policy",
  cookies: "Cookies",
};

export function BreadcrumbBar({ title }: { title?: string }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const crumbs = parts.map((seg, i) => {
    const href = "/" + parts.slice(0, i + 1).join("/");
    const label = LABELS[seg] ?? decodeURIComponent(seg).replace(/-/g, " ");
    return { href, label };
  });

  return (
    <div className="border-b border-border/60 bg-muted/20">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <button
          onClick={() => router.history.back()}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <nav className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground overflow-hidden">
          <Link to="/" className="hover:text-foreground">Home</Link>
          {crumbs.map((c, i) => (
            <span key={c.href} className="flex items-center gap-1.5 truncate">
              <ChevronRight className="h-3 w-3" />
              {i === crumbs.length - 1 ? (
                <span className="text-foreground font-medium capitalize truncate">{title ?? c.label}</span>
              ) : (
                <Link to={c.href} className="hover:text-foreground capitalize truncate">
                  {c.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>
    </div>
  );
}
