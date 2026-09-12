import { describe, expect, it } from "vitest";
import { ConfigError, readConfig } from "./config";

describe("readConfig", () => {
  it("returns the base URL with any trailing slash removed", () => {
    expect(readConfig({ MODEL_BASE_URL: "http://stub:4010/" }).modelBaseUrl).toBe("http://stub:4010");
    expect(readConfig({ MODEL_BASE_URL: "https://spark.example/adapter///" }).modelBaseUrl).toBe("https://spark.example/adapter");
  });

  it("throws a ConfigError that names MODEL_BASE_URL when it is missing or blank", () => {
    expect(() => readConfig({})).toThrow(ConfigError);
    expect(() => readConfig({})).toThrow(/MODEL_BASE_URL/);
    expect(() => readConfig({ MODEL_BASE_URL: "   " })).toThrow(/MODEL_BASE_URL/);
  });

  it("throws when the value is not an absolute http(s) URL", () => {
    expect(() => readConfig({ MODEL_BASE_URL: "stub:4010" })).toThrow(/http or https/);
    expect(() => readConfig({ MODEL_BASE_URL: "not a url" })).toThrow(/not an absolute URL/);
    expect(() => readConfig({ MODEL_BASE_URL: "ftp://stub:4010" })).toThrow(/http or https/);
  });

  it("passes MODEL_API_KEY through when set and leaves it undefined when unset or blank", () => {
    expect(readConfig({ MODEL_BASE_URL: "http://stub:4010", MODEL_API_KEY: "secret" }).modelApiKey).toBe("secret");
    expect(readConfig({ MODEL_BASE_URL: "http://stub:4010" }).modelApiKey).toBeUndefined();
    expect(readConfig({ MODEL_BASE_URL: "http://stub:4010", MODEL_API_KEY: "" }).modelApiKey).toBeUndefined();
  });
});
