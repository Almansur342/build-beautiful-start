import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Build Something Beautiful" },
      { name: "description", content: "A simple starter project ready for your next instructions." },
      { property: "og:title", content: "Build Something Beautiful" },
      { property: "og:description", content: "A simple starter project ready for your next instructions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-24">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[32rem] w-[32rem] rounded-full bg-primary/[0.04] blur-3xl" />
      </div>

      <section className="relative z-10 mx-auto max-w-2xl text-center">
        <h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Build Something Beautiful
        </h1>
        <p className="mt-6 text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
          A simple starter project ready for your next instructions.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <a href="#get-started">Get Started</a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="#learn-more">Learn More</a>
          </Button>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Created in Lovable as a clean starting point.
        </p>
      </section>
    </main>
  );
}
