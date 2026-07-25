import blogEvidenceImg from "@/assets/blog-evidence.jpg";
import blogGatesImg from "@/assets/blog-gates.jpg";
import blogExtensionImg from "@/assets/blog-extension.jpg";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: string;
  thumbnail: string;
  content: Array<{ type: "p" | "h2" | "quote" | "list"; text?: string; items?: string[] }>;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "evidence-first-qualification",
    title: "Why evidence-first qualification beats prospect lists",
    excerpt: "Static lists rot. Website evidence tells you what a business is doing right now.",
    date: "Jul 12, 2026",
    readTime: "6 min read",
    category: "Strategy",
    thumbnail: blogEvidenceImg,
    content: [
      { type: "p", text: "Every SDR has stared at a prospect list that looked great on Monday and felt worthless by Friday. Website evidence changes the shape of that problem. Instead of trusting a static CSV, you look at what a business is actually doing right now — its stack, its channels, its accessibility, its freshness — and let those signals decide." },
      { type: "h2", text: "The signals that actually matter" },
      { type: "p", text: "The Qrinux LeadLens schema normalizes 38 signals across five families: SEO health, technology stack, contact discovery, trust markers, and quality indicators. Each signal is captured on every scan and evaluated against the v1.5.0 strict gates before a verdict is emitted." },
      { type: "list", items: ["SEO health — freshness, indexability, structured data", "Technology stack — CMS, analytics, payments, marketing tools", "Contact discovery — email patterns, forms, verified handles", "Trust markers — HTTPS, policy pages, business identity", "Quality indicators — accessibility, performance, mobile posture"] },
      { type: "h2", text: "Verdicts, not vibes" },
      { type: "p", text: "Every scan ends in one of four verdicts: Eligible, Research-only, Excluded, or Retry. Reps stop arguing whether a lead is 'good' and start working the ones the system agrees are worth working. That single change is worth the whole workflow." },
      { type: "quote", text: "Prospect lists describe what a business was. Evidence describes what it is." },
      { type: "p", text: "If your team still opens the week with a static CSV, you're one refresh cycle behind the market. Evidence-first qualification closes that gap on every scan." },
    ],
  },
  {
    slug: "v1-5-0-strict-gates",
    title: "Inside the v1.5.0 strict qualification gates",
    excerpt: "How we filter out marketplaces, e-com, dead sites, and franchise portals automatically.",
    date: "Jun 28, 2026",
    readTime: "8 min read",
    category: "Product",
    thumbnail: blogGatesImg,
    content: [
      { type: "p", text: "The v1.5.0 release moves LeadLens from soft scoring to strict gates. Where earlier versions produced a score you had to interpret, the new logic answers a simpler question: should a human touch this lead at all?" },
      { type: "h2", text: "Four gates, one verdict" },
      { type: "p", text: "Each scan runs through four exclusion gates before any positive signals are counted. If any gate trips, the verdict drops to Excluded and no further evaluation happens." },
      { type: "list", items: ["Marketplace gate — filters directory-style aggregators", "E-commerce gate — routes shops to a separate pipeline", "Dead-site gate — catches abandoned domains and parked pages", "Franchise gate — deprioritizes locations owned by parent brands"] },
      { type: "h2", text: "Why strictness beats scoring" },
      { type: "p", text: "A score of 74 doesn't tell a rep what to do. A verdict does. Strict gates trade a small amount of recall for a large improvement in rep confidence — and reps who trust the system actually use it." },
    ],
  },
  {
    slug: "chrome-extension-workflow",
    title: "Building a Chrome extension SDRs actually use",
    excerpt: "The design decisions behind a zero-friction scan-and-qualify workflow.",
    date: "Jun 05, 2026",
    readTime: "5 min read",
    category: "Engineering",
    thumbnail: blogExtensionImg,
    content: [
      { type: "p", text: "The best qualification tool is the one open in the tab a rep is already looking at. That's why LeadLens ships as a Chrome extension first and a dashboard second." },
      { type: "h2", text: "Zero-friction scans" },
      { type: "p", text: "One click captures the page, normalizes the evidence, hits the API, and returns a verdict — all before the rep has time to think about switching tools. The extension never asks for a form to be filled out; the URL is the input." },
      { type: "h2", text: "Device-locked keys" },
      { type: "p", text: "Every API key binds to the first device that activates it. Sharing a key between machines fails cleanly. This is why free plans can offer 100 scans/day without abuse — the key can't multiply." },
      { type: "quote", text: "The extension disappears into the workflow. That's the whole point." },
    ],
  },
];