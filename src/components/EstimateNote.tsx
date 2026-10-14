import { CALIBRATION_NOTE } from "@/lib/pricing";

export function EstimateNote() {
  return (
    <p className="mt-3 text-xs text-muted">
      <span className="est">est.</span> = estimated from token counts at Anthropic&apos;s prices, never mixed into recorded
      costs. Estimates use rates calibrated on {CALIBRATION_NOTE.recordedLines} recorded steps, typically within ±
      {CALIBRATION_NOTE.typicalErrorPct}%.
    </p>
  );
}
