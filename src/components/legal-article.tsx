import type { ReactNode } from "react";

export function LegalArticle({
  eyebrow,
  title,
  lede,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  lede: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="max-w-3xl pb-8">
      <div className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
        {eyebrow}
      </div>
      <h1 className="mt-3 font-serif text-4xl md:text-5xl font-semibold tracking-tight leading-[1.04]">
        {title}
      </h1>
      <p className="mt-5 text-lg text-muted-foreground leading-relaxed">{lede}</p>
      <div className="mt-7 flex items-center gap-3 text-xs text-muted-foreground border-y border-border/80 py-3">
        <span className="bg-foreground text-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
          Current
        </span>
        <span>Last updated {updated}</span>
      </div>
      <div className="mt-10 space-y-12">{children}</div>
      <div className="mt-16 border-t border-border pt-8 text-xs text-muted-foreground">
        This document is maintained by Qrinux, the operator of Qrinux LeadLens. It reflects
        current app-visible controls and practices, and is not an independent certification.
      </div>
    </article>
  );
}

export function LegalSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid md:grid-cols-[6rem_1fr] gap-4 md:gap-8">
      <div className="text-xs font-mono text-muted-foreground pt-1">§ {number}</div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_b]:text-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2">
          {children}
        </div>
      </div>
    </section>
  );
}
