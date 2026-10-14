import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.join(import.meta.dirname, "..", "..", "src");
const ALLOWED = new Set(["styles/tokens.css", "app/icon.svg"]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

describe("design tokens", () => {
  it("keeps raw hex colours out of everything except tokens.css and the favicon", () => {
    const offenders = files(SRC)
      .filter((f) => !ALLOWED.has(path.relative(SRC, f)))
      .filter((f) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });
});
