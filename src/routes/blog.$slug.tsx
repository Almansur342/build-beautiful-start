import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { BLOG_POSTS } from "./index";
import { ArrowLeft, Share2, Twitter, Linkedin, Link as LinkIcon, Check } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = BLOG_POSTS.find((p) => p.slug === params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.post.title} — Qrinux LeadLens` },
          { name: "description", content: loaderData.post.excerpt },
          { property: "og:title", content: loaderData.post.title },
          { property: "og:description", content: loaderData.post.excerpt },
          { property: "og:type", content: "article" },
          { name: "twitter:card", content: "summary_large_image" },
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
  const { post } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-foreground grid place-items-center"><span className="text-background font-bold text-sm">Q</span></div>
            <span className="font-semibold">Qrinux LeadLens</span>
          </Link>
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> All posts
          </Link>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-xs text-muted-foreground">{post.date} • {post.readTime}</div>
        <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-tight">{post.title}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{post.excerpt}</p>

        <ShareBar title={post.title} />

        <div className="mt-10 aspect-[16/9] rounded-3xl bg-gradient-to-br from-accent/60 to-muted border border-border" />

        <div className="prose prose-neutral max-w-none mt-10 space-y-6 text-[17px] leading-relaxed">
          <p>
            Every SDR has stared at a prospect list that looked great on Monday and felt worthless by Friday.
            Website evidence changes the shape of that problem. Instead of trusting a static CSV, you look at
            what a business is actually doing right now — its stack, its channels, its accessibility, its
            freshness — and let those signals decide.
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">The signals that actually matter</h2>
          <p>
            The Qrinux LeadLens schema normalizes 38 signals across five families: SEO health, technology
            stack, contact discovery, trust markers, and quality indicators. Each signal is captured on every
            scan and evaluated against the v1.5.0 strict gates before a verdict is emitted.
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Verdicts, not vibes</h2>
          <p>
            Every scan ends in one of four verdicts: Eligible, Research-only, Excluded, or Retry. Reps stop
            arguing whether a lead is "good" and start working the ones the system agrees are worth working.
            That single change is worth the whole workflow.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <div className="text-sm text-muted-foreground mb-3">Share this article</div>
          <ShareBar title={post.title} compact />
        </div>
      </article>
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
    <div className={`flex items-center gap-2 flex-wrap ${compact ? "" : "mt-6"}`}>
      <button
        onClick={share}
        className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90"
      >
        <Share2 className="h-4 w-4" /> Share
      </button>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
      >
        <Twitter className="h-4 w-4" /> Twitter
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
      >
        <Linkedin className="h-4 w-4" /> LinkedIn
      </a>
      <button
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
      >
        {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
