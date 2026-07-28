import { describe, expect, it } from "vitest";
import { parseLabTestInput } from "./parse-lab-test-input";

const validBody = {
  code: "cbc",
  name: "Complete Blood Count",
  price: "24.99",
  turnaroundDays: 1,
};

describe("parseLabTestInput", () => {
  it("accepts a valid body, trimming/uppercasing the code and trimming the name", () => {
    const result = parseLabTestInput({
      ...validBody,
      code: "  cbc  ",
      name: "  Complete Blood Count  ",
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      code: "CBC",
      name: "Complete Blood Count",
      price: "24.99",
      turnaroundDays: 1,
    });
  });

  it("accepts a numeric price", () => {
    const result = parseLabTestInput({ ...validBody, price: 24.99 });

    expect(result.data).toEqual(expect.objectContaining({ price: "24.99" }));
  });

  it("rejects a non-object body", () => {
    expect(parseLabTestInput("not an object").error).toMatch(/JSON object/);
    expect(parseLabTestInput(null).error).toMatch(/JSON object/);
    expect(parseLabTestInput(["a", "b"]).error).toMatch(/JSON object/);
  });

  it("rejects a missing or blank code", () => {
    expect(parseLabTestInput({ ...validBody, code: undefined }).error).toMatch(/code is required/);
    expect(parseLabTestInput({ ...validBody, code: "   " }).error).toMatch(/code is required/);
  });

  it("rejects a missing or blank name", () => {
    expect(parseLabTestInput({ ...validBody, name: undefined }).error).toMatch(/name is required/);
    expect(parseLabTestInput({ ...validBody, name: "   " }).error).toMatch(/name is required/);
  });

  it.each([undefined, "not-a-number", 0, -5])(
    "rejects an invalid price (%s)",
    (price) => {
      expect(parseLabTestInput({ ...validBody, price }).error).toMatch(
        /price must be a positive number/
      );
    }
  );

  it.each([undefined, "1", 0, -1, 1.5])(
    "rejects an invalid turnaroundDays (%s)",
    (turnaroundDays) => {
      expect(parseLabTestInput({ ...validBody, turnaroundDays }).error).toMatch(
        /turnaroundDays must be a positive integer/
      );
    }
  );
});
