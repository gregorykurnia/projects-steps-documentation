export function StatusChip({ status }: { status: "in_progress" | "done" }) {
  const done = status === "done";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-xs ${done ? "text-success" : "text-muted"}`}
    >
      <span className={`size-1.5 rounded-full ${done ? "bg-success" : "bg-accent"}`} aria-hidden />
      {done ? "Done" : "In progress"}
    </span>
  );
}
