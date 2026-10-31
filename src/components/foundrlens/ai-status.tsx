// Shows that AI features run through Google's Gemini API, and whether a request is in progress.
export function AiStatus({ busy = false }: { busy?: boolean }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
    >
      <span className={`size-2 rounded-full ${busy ? "animate-pulse bg-primary" : "bg-success"}`} />
      {busy ? "Sending to Gemini API…" : "AI powered by Gemini API"}
    </span>
  );
}
