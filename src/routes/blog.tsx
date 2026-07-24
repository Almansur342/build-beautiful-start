import { createFileRoute, Link } from "@tanstack/react-router";
import { BLOG_POSTS } from "./index";
import { BreadcrumbBar } from "@/components/breadcrumb-bar";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Qrinux LeadLens" },
      { name: "description", content: "Ideas, product deep-dives, and sales craft from the Qrinux LeadLens team." },
      { property: "og:title", content: "Qrinux LeadLens — Blog" },
      { property: "og:description", content: "Sharper prospecting, one read at a time." },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbBar title="Blog" />
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">Blog</div>
        <h1 className="text-5xl font-semibold tracking-tight">Ideas from the field.</h1>
        <p className="mt-4 text-muted-foreground max-w-xl">Deep dives on evidence-first qualification, outbound strategy, and the craft behind LeadLens.</p>

        <div className="mt-14 grid md:grid-cols-2 gap-6">
          {BLOG_POSTS.map((p) => (
            <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }} className="group rounded-3xl border border-border bg-card overflow-hidden">
              <div className="aspect-[16/10] bg-gradient-to-br from-accent/60 to-muted" />
              <div className="p-6">
                <div className="text-xs text-muted-foreground">{p.date} • {p.readTime}</div>
                <h3 className="mt-2 font-semibold text-xl group-hover:underline">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
