import { describe, expect, it } from "vitest";
import { h } from "preact";
import { render } from "preact";

describe("T1 smoke", () => {
  it("runs the test suite", () => {
    expect(1 + 1).toBe(2);
  });

  it("can import Preact", () => {
    expect(typeof h).toBe("function");
    expect(typeof render).toBe("function");
  });
});
