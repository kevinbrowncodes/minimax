import { describe, expect, it, vi } from "vitest";
import { THEME_BOOT_SCRIPT, THEME_CHOICES, THEME_STORAGE_KEY, applyChoice, attributeFor, parseChoice, readStoredChoice, resolveTheme, storeChoice, themeBoot } from "./theme";

describe("theme choice (STORY_019)", () => {
  it("offers the reference's three choices in its order and wording", () => {
    expect(THEME_CHOICES.map((c) => `${c.id}:${c.label}`)).toEqual(["light:Light mode", "dark:Dark mode", "system:System"]);
  });

  it("parses only the two explicit choices; anything else is system", () => {
    expect(parseChoice("light")).toBe("light");
    expect(parseChoice("dark")).toBe("dark");
    expect(parseChoice("system")).toBe("system");
    expect(parseChoice(null)).toBe("system");
    expect(parseChoice("blue")).toBe("system");
  });

  it("resolves system from the preference and the explicit choices from themselves", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("sets data-theme for an explicit choice and removes it for system", () => {
    const root = { setAttribute: vi.fn(), removeAttribute: vi.fn() };
    applyChoice(root, "dark");
    expect(root.setAttribute).toHaveBeenCalledWith("data-theme", "dark");
    applyChoice(root, "system");
    expect(root.removeAttribute).toHaveBeenCalledWith("data-theme");
    expect(attributeFor("light")).toBe("light");
    expect(attributeFor("system")).toBeNull();
  });

  it("round-trips through storage, stores system as an absence, and survives a throwing storage", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
    storeChoice(storage, "dark");
    expect(store.get(THEME_STORAGE_KEY)).toBe("dark");
    expect(readStoredChoice(storage)).toBe("dark");
    storeChoice(storage, "system");
    expect(store.has(THEME_STORAGE_KEY)).toBe(false);
    expect(readStoredChoice(storage)).toBe("system");
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readStoredChoice(broken)).toBe("system");
    expect(() => {
      storeChoice(broken, "dark");
    }).not.toThrow();
    expect(readStoredChoice(null)).toBe("system");
  });

  it("the boot function applies a stored explicit choice before paint, leaves system alone, and survives a blocked storage", () => {
    const root = document.documentElement;
    const run = (stored: string | null) => {
      root.removeAttribute("data-theme");
      const spy = vi.spyOn(Storage.prototype, "getItem").mockReturnValue(stored);
      themeBoot();
      expect(spy).toHaveBeenCalledWith(THEME_STORAGE_KEY);
      spy.mockRestore();
      return root.getAttribute("data-theme");
    };
    expect(run("dark")).toBe("dark");
    expect(run("light")).toBe("light");
    expect(run(null)).toBeNull();
    expect(run("nonsense")).toBeNull();
    const throwing = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => {
      themeBoot();
    }).not.toThrow();
    throwing.mockRestore();
    root.removeAttribute("data-theme");
  });

  it("the inline script is the boot function's own source, invoked, and names the storage key literally", () => {
    expect(THEME_BOOT_SCRIPT.startsWith("(function")).toBe(true);
    expect(THEME_BOOT_SCRIPT.endsWith(")();")).toBe(true);
    expect(THEME_BOOT_SCRIPT).toContain(`"${THEME_STORAGE_KEY}"`);
    expect(THEME_BOOT_SCRIPT).toContain("data-theme");
  });
});
