import { describe, expect, it } from "vitest";
import { formatCost } from "../../src/core/format";

describe("T25 formato de costes (RF-17)", () => {
  it("RF-17 solo los recursos con coste, en el orden comida · madera · oro · piedra", () => {
    expect(formatCost({ food: 55, wood: 0, gold: 25, stone: 0 }, "es")).toBe("55 comida · 25 oro");
    expect(formatCost({ food: 0, wood: 200, gold: 0, stone: 150 }, "es")).toBe("200 madera · 150 piedra");
  });

  it("RF-17 en inglés", () => {
    expect(formatCost({ food: 400, wood: 0, gold: 250, stone: 0 }, "en")).toBe("400 food · 250 gold");
  });

  it("coste cero → cadena vacía", () => {
    expect(formatCost({ food: 0, wood: 0, gold: 0, stone: 0 }, "es")).toBe("");
  });
});
