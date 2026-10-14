import { formatCost } from "@/lib/format";

/**
 * A cost with its estimated part kept visible: "$95.40" with "incl. $0.39 est." beneath it, or
 * "$0.54 est." when nothing in it was recorded. Missing shows as "—".
 */
export function Cost({
  total,
  estimated = 0,
  align = "end",
}: {
  total: number | null;
  estimated?: number;
  align?: "start" | "end";
}) {
  if (total === null) return <span className="num text-muted">—</span>;
  const allEstimated = estimated > 0 && Math.abs(total - estimated) < 0.00005;
  const title = `$${total.toFixed(4)}${estimated > 0 ? ` (est. $${estimated.toFixed(4)})` : ""}`;
  if (allEstimated) {
    return (
      <span className="num est" title={title}>
        {formatCost(total, { est: true })}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex flex-col leading-tight ${align === "end" ? "items-end" : "items-start"}`}
      title={title}
    >
      <span className="num">{formatCost(total)}</span>
      {estimated > 0 ? (
        <span className="est font-sans text-[11px] font-normal whitespace-nowrap">incl. {formatCost(estimated)} est.</span>
      ) : null}
    </span>
  );
}
