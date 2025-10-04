import { getEnvVar, getEnvVarOptional, logger } from "../src/utils.js";
import {
  test,
  expect,
  describe,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

describe("utils", () => {
  const originalEnv = process.env;
  const originalConsole = { ...console };

  beforeEach(() => {
    process.env = { ...originalEnv };
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.debug = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
  });

  describe("getEnvVar", () => {
    test("throws when missing", () => {
      expect(() => getEnvVar("MISSING")).toThrow(
        "Missing required env var: MISSING",
      );
    });

    test("returns trimmed value", () => {
      process.env.FOO = "  bar  ";
      expect(getEnvVar("FOO")).toBe("bar");
    });
  });

  describe("getEnvVarOptional", () => {
    test("returns undefined when missing", () => {
      expect(getEnvVarOptional("MISSING")).toBeUndefined();
    });

    test("returns trimmed value when present", () => {
      process.env.FOO = "  bar  ";
      expect(getEnvVarOptional("FOO")).toBe("bar");
    });
  });

  describe("logger", () => {
    test("debug logs only when DEBUG is enabled", () => {
      process.env.DEBUG = "1";
      logger.debug("test");
      expect(console.debug).toHaveBeenCalledWith("[DEBUG]", "test");

      delete process.env.DEBUG;
      logger.debug("test");
      expect(console.debug).toHaveBeenCalledTimes(1);
    });
  });
});
