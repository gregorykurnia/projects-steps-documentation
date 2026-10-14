import { effortLabel, modelFamily, modelLabel } from "@/lib/models";

const TINT = {
  opus: "bg-opus/10 text-opus",
  sonnet: "bg-sonnet/10 text-sonnet",
  haiku: "bg-haiku/10 text-haiku",
  other: "bg-accent-soft text-muted",
} as const;

export function ModelBadge({ model, effort }: { model: string; effort?: string | null }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${TINT[modelFamily(model)]}`}>
      {modelLabel(model)}
      {effort ? <span className="ml-1 opacity-70">· {effortLabel(effort)}</span> : null}
    </span>
  );
}
