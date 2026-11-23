import { describe, expect, it } from "vitest";
import { browserStore, loadPreferences, PREFS_KEY, savePreferences, type KeyValueStore } from "../../src/core/storage";
import type { Preferences } from "../../src/core/types";

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const throwingStore: KeyValueStore = {
  getItem: () => {
    throw new DOMException("denied", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("quota", "QuotaExceededError");
  },
};

const CHOSEN: Preferences = { lang: "es", nomenclature: "es", lastMap: "black_forest", lastCard: { civ: "Franks", map: "arena" } };

describe("T21 preferencias del usuario", () => {
  describe("valores por defecto (primera visita)", () => {
    it("RF-3 mapa Arabia, RF-9 sin última tarjeta, nomenclatura de Latinoamérica", () => {
      expect(loadPreferences(memoryStore(), ["en-US"])).toEqual({
        lang: "en",
        nomenclature: "mx",
        lastMap: "arabia",
        lastCard: null,
      });
    });

    it("RF-22 el idioma inicial sale del idioma preferido del navegador", () => {
      expect(loadPreferences(memoryStore(), ["es-AR", "en"]).lang).toBe("es");
    });
  });

  describe("se guardan y se recuperan", () => {
    it("RF-23 idioma y nomenclatura elegidos, RF-3 último mapa y RF-9 última tarjeta", () => {
      const store = memoryStore();
      savePreferences(store, CHOSEN);
      expect(loadPreferences(store, ["en-US"])).toEqual(CHOSEN);
    });

    it("RF-23 el idioma guardado manda sobre el del navegador", () => {
      const store = memoryStore();
      savePreferences(store, { ...CHOSEN, lang: "en" });
      expect(loadPreferences(store, ["es-AR"]).lang).toBe("en");
    });

    it("se guardan bajo una sola clave propia de la app", () => {
      const store = memoryStore();
      savePreferences(store, CHOSEN);
      expect(Object.keys(store.data)).toEqual([PREFS_KEY]);
    });
  });

  describe("almacenamiento que falla: valores por defecto sin errores", () => {
    it("leer de un almacenamiento que lanza errores devuelve los valores por defecto", () => {
      expect(loadPreferences(throwingStore, ["es-MX"])).toEqual({
        lang: "es",
        nomenclature: "mx",
        lastMap: "arabia",
        lastCard: null,
      });
    });

    it("guardar en un almacenamiento que lanza errores no falla", () => {
      expect(() => savePreferences(throwingStore, CHOSEN)).not.toThrow();
    });

    it("sin almacenamiento disponible (null) tampoco falla", () => {
      expect(loadPreferences(null, ["en"]).lastMap).toBe("arabia");
      expect(() => savePreferences(null, CHOSEN)).not.toThrow();
    });

    it("si acceder a localStorage lanza un error, browserStore devuelve null", () => {
      const host = {
        get localStorage(): Storage {
          throw new DOMException("denied", "SecurityError");
        },
      };
      expect(browserStore(host)).toBeNull();
    });

    it("browserStore devuelve el localStorage cuando existe", () => {
      const storage = memoryStore() as unknown as Storage;
      expect(browserStore({ localStorage: storage })).toBe(storage);
    });
  });

  describe("datos guardados dañados o de otra versión", () => {
    it("JSON roto → valores por defecto", () => {
      expect(loadPreferences(memoryStore({ [PREFS_KEY]: "{no es json" }), ["en"])).toEqual(
        loadPreferences(memoryStore(), ["en"]),
      );
    });

    it("cada valor inválido se sustituye por su valor por defecto y se conservan los válidos", () => {
      const stored = JSON.stringify({ lang: "fr", nomenclature: "es", lastMap: "nomad", lastCard: { civ: "Franks", map: "atlantis" } });
      expect(loadPreferences(memoryStore({ [PREFS_KEY]: stored }), ["es"])).toEqual({
        lang: "es",
        nomenclature: "es",
        lastMap: "arabia",
        lastCard: null,
      });
    });

    it("un valor que no es un objeto → valores por defecto", () => {
      expect(loadPreferences(memoryStore({ [PREFS_KEY]: "42" }), ["en"]).lastCard).toBeNull();
      expect(loadPreferences(memoryStore({ [PREFS_KEY]: "null" }), ["en"]).lastMap).toBe("arabia");
    });

    it("última tarjeta sin civilización válida → sin última tarjeta", () => {
      const stored = JSON.stringify({ lastCard: { civ: "", map: "arena" } });
      expect(loadPreferences(memoryStore({ [PREFS_KEY]: stored }), ["en"]).lastCard).toBeNull();
    });
  });
});
