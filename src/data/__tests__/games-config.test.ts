import { describe, it, expect } from "vitest";
import { GAMES, getGameConfig } from "../games-config";

describe("getGameConfig", () => {
  it("finds a game by its slug", () => {
    const game = getGameConfig("tetris");
    expect(game).toBeDefined();
    expect(game!.title).toBe("Tetris");
    expect(game!.core).toBe("fceumm");
  });

  it("finds space-cadet by slug", () => {
    const game = getGameConfig("space-cadet");
    expect(game).toBeDefined();
    expect(game!.core).toBe("custom");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getGameConfig("nonexistent-game")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(getGameConfig("")).toBeUndefined();
  });
});

describe("GAMES catalog integrity", () => {
  it("has at least 10 games configured", () => {
    expect(GAMES.length).toBeGreaterThanOrEqual(10);
  });

  it("every game has an id, title, rom, and core", () => {
    for (const game of GAMES) {
      expect(game.id, `Game missing id`).toBeTruthy();
      expect(game.title, `Game ${game.id} missing title`).toBeTruthy();
      expect(game.rom, `Game ${game.id} missing rom`).toBeTruthy();
      expect(game.core, `Game ${game.id} missing core`).toBeTruthy();
    }
  });

  it("every game has a description", () => {
    for (const game of GAMES) {
      expect(game.description, `Game ${game.id} missing description`).toBeTruthy();
    }
  });

  it("has no duplicate game IDs", () => {
    const ids = GAMES.map((g) => g.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("every game has a valid inputMethod", () => {
    for (const game of GAMES) {
      if (game.inputMethod) {
        expect(["controller", "keyboard"]).toContain(game.inputMethod);
      }
    }
  });
});
