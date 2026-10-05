import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { verifyMutationRequest } from "../src/server/request-policy";

const endpoint = "https://studio.example.test/api/projects";
function request(origin?: string, workspace?: string) {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  if (workspace) headers.set("x-workspace-id", workspace);
  return new Request(endpoint, { method: "POST", headers });
}

describe("mutation request boundary", () => {
  const previousOrigin = process.env.APP_ORIGIN;
  beforeAll(() => {
    process.env.APP_ORIGIN = "https://studio.example.test";
  });
  afterAll(() => {
    if (previousOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previousOrigin;
  });
  it("requires the verified active workspace", () => {
    expect(() =>
      verifyMutationRequest(
        request(endpoint.replace("/api/projects", ""), "org_other"),
        "org_active",
      ),
    ).toThrow();
  });
  it("requires a same-scheme same-host browser origin", () => {
    expect(() =>
      verifyMutationRequest(request(undefined, "org_active"), "org_active"),
    ).toThrow();
    expect(() =>
      verifyMutationRequest(
        request("https://attacker.test", "org_active"),
        "org_active",
      ),
    ).toThrow();
    expect(() =>
      verifyMutationRequest(
        request("http://studio.example.test", "org_active"),
        "org_active",
      ),
    ).toThrow();
    expect(() =>
      verifyMutationRequest(request("not-a-url", "org_active"), "org_active"),
    ).toThrow();
  });
  it("accepts an active-workspace request from the same origin", () => {
    expect(() =>
      verifyMutationRequest(
        request("https://studio.example.test", "org_active"),
        "org_active",
      ),
    ).not.toThrow();
  });
});
