import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { BLOG_POSTS } from "./index";
import { BreadcrumbBar } from "@/components/breadcrumb-bar";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 4;

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Qrinux LeadLens" },
      { name: "description", content: "Ideas, product deep-dives, and sales craft from the Qrinux LeadLens team." },
      { property: "og:title", content: "Qrinux LeadLens — Blog" },
      { property: "og:description", content: "Sharper prospecting, one read at a time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  const [featured, ...rest] = BLOG_POSTS;
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const paged = useMemo(
    () => rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rest, page],
  );

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbBar title="Blog" />
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">Blog</div>
        <h1 className="text-5xl font-semibold tracking-tight">Ideas from the field.</h1>
        <p className="mt-4 text-muted-foreground max-w-xl">
          Deep dives on evidence-first qualification, outbound strategy, and the craft behind LeadLens.
        </p>

        {featured && page === 1 && (
          <Link
            to="/blog/$slug"
            params={{ slug: featured.slug }}
            className="mt-14 group grid md:grid-cols-2 gap-0 border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="aspect-[16/10] md:aspect-auto overflow-hidden bg-muted">
              <img
                src={featured.thumbnail}
                alt={featured.title}
                width={1600}
                height={1000}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
            <div className="p-8 md:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-foreground text-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                  Featured
                </span>
                <span>{featured.category}</span>
                <span>·</span>
                <span>{featured.date}</span>
                <span>·</span>
                <span>{featured.readTime}</span>
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight group-hover:underline">{featured.title}</h2>
              <p className="mt-3 text-muted-foreground">{featured.excerpt}</p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium">
                Read article <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        )}

        <div className="mt-10 grid md:grid-cols-2 gap-6">
          {paged.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="group border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-[16/10] overflow-hidden bg-muted">
                <img
                  src={p.thumbnail}
                  alt={p.title}
                  width={1600}
                  height={1000}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-foreground text-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                    {p.category}
                  </span>
                  <span>{p.date} · {p.readTime}</span>
                </div>
                <h3 className="mt-3 font-semibold text-xl group-hover:underline">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>

        {totalPages > 1 && (
          <nav className="mt-12 flex items-center justify-between border-t border-border pt-6" aria-label="Blog pagination">
            <button
              onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page === 1}
              className="inline-flex items-center gap-1 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:underline"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className={`h-9 w-9 text-sm font-medium border ${
                    n === page
                      ? "bg-foreground text-background border-foreground"
                      : "border-border hover:bg-muted"
                  }`}
                  aria-current={n === page ? "page" : undefined}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:underline"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        )}
      </main>
    </div>
  );
}

