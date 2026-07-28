import { describe, expect, it } from "vitest";
import { parsePatientInput } from "./parse-patient-input";

const validBody = {
  firstName: "Alice",
  lastName: "Nguyen",
  dateOfBirth: "1988-03-14",
  email: "alice@example.com",
  phone: "555-0101",
};

describe("parsePatientInput", () => {
  it("accepts a valid body, trimming names and parsing the date as UTC midnight", () => {
    const result = parsePatientInput({
      ...validBody,
      firstName: "  Alice  ",
      lastName: "  Nguyen  ",
    });

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({
      firstName: "Alice",
      lastName: "Nguyen",
      dateOfBirth: new Date("1988-03-14T00:00:00.000Z"),
      email: "alice@example.com",
      phone: "555-0101",
    });
  });

  it("accepts email only", () => {
    const result = parsePatientInput({ ...validBody, phone: undefined });
    expect(result.data).toEqual(expect.objectContaining({ email: "alice@example.com", phone: null }));
  });

  it("accepts phone only", () => {
    const result = parsePatientInput({ ...validBody, email: undefined });
    expect(result.data).toEqual(expect.objectContaining({ email: null, phone: "555-0101" }));
  });

  it("rejects a non-object body", () => {
    expect(parsePatientInput("nope").error).toMatch(/JSON object/);
    expect(parsePatientInput(null).error).toMatch(/JSON object/);
    expect(parsePatientInput(["a"]).error).toMatch(/JSON object/);
  });

  it("rejects a missing or blank firstName", () => {
    expect(parsePatientInput({ ...validBody, firstName: undefined }).error).toMatch(
      /firstName is required/
    );
    expect(parsePatientInput({ ...validBody, firstName: "  " }).error).toMatch(
      /firstName is required/
    );
  });

  it("rejects a missing or blank lastName", () => {
    expect(parsePatientInput({ ...validBody, lastName: undefined }).error).toMatch(
      /lastName is required/
    );
  });

  it.each([undefined, "not-a-date", "03/14/1988", "1988-3-14"])(
    "rejects an invalid dateOfBirth (%s)",
    (dateOfBirth) => {
      expect(parsePatientInput({ ...validBody, dateOfBirth }).error).toMatch(
        /dateOfBirth is required/
      );
    }
  );

  it("rejects a dateOfBirth in the future", () => {
    const futureYear = new Date().getUTCFullYear() + 5;
    expect(
      parsePatientInput({ ...validBody, dateOfBirth: `${futureYear}-01-01` }).error
    ).toMatch(/cannot be in the future/);
  });

  it("rejects an invalid email format", () => {
    expect(parsePatientInput({ ...validBody, email: "not-an-email" }).error).toMatch(
      /valid email address/
    );
  });

  it("rejects a non-string email or phone", () => {
    expect(parsePatientInput({ ...validBody, email: 12345 }).error).toMatch(
      /email must be a string/
    );
    expect(parsePatientInput({ ...validBody, phone: 12345 }).error).toMatch(
      /phone must be a string/
    );
  });

  it("rejects when both email and phone are missing", () => {
    expect(
      parsePatientInput({ ...validBody, email: undefined, phone: undefined }).error
    ).toMatch(/At least one of email or phone is required/);
  });

  it("rejects when both email and phone are blank strings", () => {
    expect(parsePatientInput({ ...validBody, email: "  ", phone: "  " }).error).toMatch(
      /At least one of email or phone is required/
    );
  });
});
