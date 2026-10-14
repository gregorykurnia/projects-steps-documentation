import { Card } from "./ui/card";

export function StatTile({
  label,
  value,
  sub,
  title,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  title?: string;
}) {
  return (
    <Card className="px-4 py-3.5" title={title}>
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="num mt-1 text-xl font-semibold text-text sm:text-2xl">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-muted">{sub}</div> : null}
    </Card>
  );
}
