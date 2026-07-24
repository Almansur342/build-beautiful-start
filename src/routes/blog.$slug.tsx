import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { BLOG_POSTS, type BlogPost } from "./index";
import { Share2, Twitter, Linkedin, Link as LinkIcon, Check, ArrowRight, ArrowLeft, Clock, Calendar } from "lucide-react";
import { BreadcrumbBar } from "@/components/breadcrumb-bar";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = BLOG_POSTS.find((p) => p.slug === params.slug);
    if (!post) throw notFound();
    const idx = BLOG_POSTS.indexOf(post);
    const related = BLOG_POSTS.filter((_, i) => i !== idx).slice(0, 2);
    return { post, related };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.post.title} — Qrinux LeadLens` },
          { name: "description", content: loaderData.post.excerpt },
          { property: "og:title", content: loaderData.post.title },
          { property: "og:description", content: loaderData.post.excerpt },
          { property: "og:type", content: "article" },
          { property: "og:image", content: loaderData.post.thumbnail },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:image", content: loaderData.post.thumbnail },
        ]
      : [{ title: "Post — Qrinux LeadLens" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <p className="text-muted-foreground mb-4">Post not found.</p>
        <Link to="/blog" className="text-sm font-medium underline">Back to blog</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center text-destructive">Error: {error.message}</div>
  ),
  component: BlogPost,
});

function BlogPost() {
  const { post, related } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      <BreadcrumbBar title={post.title} />

      {/* Hero */}
      <header className="max-w-4xl mx-auto px-6 pt-14 pb-10">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> All posts
        </Link>
        <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="bg-foreground text-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
            {post.category}
          </span>
          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {post.date}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readTime}</span>
        </div>
        <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">{post.title}</h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl">{post.excerpt}</p>
        <div className="mt-6">
          <ShareBar title={post.title} />
        </div>
      </header>

      {/* Hero image */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="aspect-[16/9] overflow-hidden bg-muted border border-border">
          <img
            src={post.thumbnail}
            alt={post.title}
            width={1600}
            height={1000}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Body */}
      <article className="max-w-3xl mx-auto px-6 py-14">
        <div className="space-y-6 text-[17px] leading-relaxed text-foreground/90">
          {post.content.map((block: BlogPost["content"][number], i: number) => {
            if (block.type === "h2") {
              return (
                <h2 key={i} className="text-2xl font-semibold tracking-tight text-foreground pt-4">
                  {block.text}
                </h2>
              );
            }
            if (block.type === "quote") {
              return (
                <blockquote
                  key={i}
                  className="border-l-2 border-foreground pl-5 py-1 text-xl font-medium text-foreground italic"
                >
                  {block.text}
                </blockquote>
              );
            }
            if (block.type === "list") {
              return (
                <ul key={i} className="space-y-2 pl-1">
                  {block.items?.map((li: string, j: number) => (
                    <li key={j} className="flex gap-3">
                      <span className="mt-2.5 h-1 w-1 bg-foreground shrink-0" />
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              );
            }
            return <p key={i}>{block.text}</p>;
          })}
        </div>

        <div className="mt-14 pt-8 border-t border-border">
          <div className="text-sm text-muted-foreground mb-3">Share this article</div>
          <ShareBar title={post.title} compact />
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-border bg-muted/40">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
              <div>
                <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-2">Keep reading</div>
                <h2 className="text-3xl font-semibold tracking-tight">More from the blog</h2>
              </div>
              <Link to="/blog" className="text-sm font-medium inline-flex items-center gap-1">
                All posts <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {related.map((p: BlogPost) => (
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
                    <h3 className="mt-3 font-semibold text-lg group-hover:underline">{p.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ShareBar({ title, compact }: { title: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";

  const share = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, url });
        return;
      } catch {}
    }
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${compact ? "" : ""}`}>
      <button
        onClick={share}
        className="inline-flex items-center gap-2 bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 border border-border px-4 py-2 text-sm hover:bg-muted"
      >
        <Twitter className="h-4 w-4" /> Twitter
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 border border-border px-4 py-2 text-sm hover:bg-muted"
      >
        <Linkedin className="h-4 w-4" /> LinkedIn
      </a>
      <button
        onClick={copy}
        className="inline-flex items-center gap-2 border border-border px-4 py-2 text-sm hover:bg-muted"
      >
        {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
