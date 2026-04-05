import { describe, it, expect } from "vitest";
import { mapVerdictToDb } from "../useAntiCheat";
import type { WasmVerdict } from "../useAntiCheat";

describe("mapVerdictToDb", () => {
  it('maps accepted=true to status "clean"', () => {
    const verdict: WasmVerdict = {
      accepted: true,
      suspicious: false,
      reasonCodes: [],
    };
    const result = mapVerdictToDb(verdict);
    expect(result.status).toBe("clean");
    expect(result.reason).toBeNull();
  });

  it('maps suspicious=true (not accepted) to status "suspected"', () => {
    const verdict: WasmVerdict = {
      accepted: false,
      suspicious: true,
      reasonCodes: ["HIGH_APS", "LOW_INPUTS"],
    };
    const result = mapVerdictToDb(verdict);
    expect(result.status).toBe("suspected");
    expect(result.reason).toBe("HIGH_APS, LOW_INPUTS");
  });

  it('maps accepted=false, suspicious=false to status "confirmed"', () => {
    const verdict: WasmVerdict = {
      accepted: false,
      suspicious: false,
      reasonCodes: ["IMPOSSIBLE_SCORE"],
    };
    const result = mapVerdictToDb(verdict);
    expect(result.status).toBe("confirmed");
    expect(result.reason).toBe("IMPOSSIBLE_SCORE");
  });

  it("returns null reason when reasonCodes is empty", () => {
    const verdict: WasmVerdict = {
      accepted: true,
      suspicious: false,
      reasonCodes: [],
    };
    const result = mapVerdictToDb(verdict);
    expect(result.reason).toBeNull();
  });

  it("joins multiple reason codes with commas", () => {
    const verdict: WasmVerdict = {
      accepted: false,
      suspicious: true,
      reasonCodes: ["A", "B", "C"],
    };
    const result = mapVerdictToDb(verdict);
    expect(result.reason).toBe("A, B, C");
  });

  it("preserves extra fields in evidence", () => {
    const verdict: WasmVerdict = {
      accepted: true,
      suspicious: false,
      reasonCodes: [],
      inputsRecorded: 250,
      elapsedMs: 120000,
    };
    const result = mapVerdictToDb(verdict);
    expect(result.evidence).toHaveProperty("inputsRecorded", 250);
    expect(result.evidence).toHaveProperty("elapsedMs", 120000);
  });

  it("accepted takes priority over suspicious when both true", () => {
    const verdict: WasmVerdict = {
      accepted: true,
      suspicious: true,
      reasonCodes: ["EDGE_CASE"],
    };
    const result = mapVerdictToDb(verdict);
    // accepted is checked first, so status should be "clean"
    expect(result.status).toBe("clean");
  });
});
