import { describe, it, expect } from "vitest";
import { cn } from "../../packages/lib/utils";

describe("cn (className merger)", () => {
  it("merge simple", () => expect(cn("text-white", "bg-blue-500")).toBe("text-white bg-blue-500"));
  it("conditional", () => expect(cn("base", true && "active", false && "hidden")).toBe("base active"));
  it("conflict last wins", () => expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500"));
  it("undefined/null", () => expect(cn("base", undefined, null, "end")).toBe("base end"));
  it("empty strings", () => expect(cn("", "text-white", "")).toBe("text-white"));
  it("object syntax", () => expect(cn({ "text-white": true, "bg-red-500": false, "p-4": true })).toBe("text-white p-4"));
  it("array syntax", () => expect(cn(["text-white", "bg-blue-500"])).toBe("text-white bg-blue-500"));
  it("padding conflict", () => expect(cn("p-4", "p-2")).toBe("p-2"));
  it("margin conflict", () => expect(cn("mt-4", "mt-8")).toBe("mt-8"));
  it("no args", () => expect(cn()).toBe(""));
});
