/**
 * Spec 008: what a stay card shows for the tutor and the number of nights. The card itself is not
 * rendered here (research R3); these helpers hold every decision it makes.
 */
import { describe, expect, it } from "vitest";
import { nightsLabel, tutorLabel } from "@/lib/format";

describe("tutorLabel", () => {
  it("puts the name before the number", () => {
    expect(tutorLabel(7, "Ana Souza")).toEqual({ name: "Ana Souza", number: "Tutor nº 7" });
  });

  it("keeps the number alone when the API sends no name (older API)", () => {
    expect(tutorLabel(7, undefined)).toEqual({ name: null, number: "Tutor nº 7" });
  });

  it("treats a blank name as no name", () => {
    expect(tutorLabel(7, "   ")).toEqual({ name: null, number: "Tutor nº 7" });
  });

  it("trims the name", () => {
    expect(tutorLabel(7, "  Ana Souza ").name).toBe("Ana Souza");
  });
});

describe("nightsLabel", () => {
  it("shows the API's count, plural and singular", () => {
    expect(nightsLabel(11)).toBe("11 noites");
    expect(nightsLabel(1)).toBe("1 noite");
    expect(nightsLabel(0)).toBe("0 noites");
  });

  it("shows nothing when the API sent no usable count (older API, bad value)", () => {
    for (const value of [undefined, null, -1, 1.5, Number.NaN]) {
      expect(nightsLabel(value)).toBeNull();
    }
  });

  it("does not show a value of the wrong type", () => {
    expect(nightsLabel("3" as unknown as number)).toBeNull();
  });
});
