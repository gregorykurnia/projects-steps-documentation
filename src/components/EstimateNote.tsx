import { CALIBRATION_NOTE } from "@/lib/pricing";

export function EstimateNote() {
  return (
    <p className="mt-3 text-xs text-muted">
      <span className="est">est.</span> = estimated from token counts at Anthropic&apos;s or OpenAI&apos;s prices, never mixed
      into recorded costs. Claude estimates use rates calibrated on {CALIBRATION_NOTE.recordedLines} recorded steps,
      typically within ±{CALIBRATION_NOTE.typicalErrorPct}%; GPT estimates use OpenAI&apos;s list prices.
    </p>
  );
}
