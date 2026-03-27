/**
 * Keyboard-to-controller mappings per game.
 * Each game maps physical keyboard keys to NES-style controller buttons.
 */

export interface KeyMapping {
  up: string;
  upAction?: string;
  down: string;
  downAction?: string;
  left: string;
  leftAction?: string;
  right: string;
  rightAction?: string;
  a: string;
  aAction?: string;
  b: string;
  bAction?: string;
  start: string;
  startAction?: string;
  select: string;
  selectAction?: string;
  /** Extra buttons for MAME coin-ops, etc. */
  extras?: { label: string; key: string; action?: string }[];
}

/** DB keymapping shape stored as JSONB */
export interface DbKeymapping {
  up?: { key: string; action: string };
  down?: { key: string; action: string };
  left?: { key: string; action: string };
  right?: { key: string; action: string };
  a?: { key: string; action: string };
  b?: { key: string; action: string };
  start?: { key: string; action: string };
  select?: { key: string; action: string };
  extras?: { key: string; action: string }[];
}

/** Default MAME mapping used by EmulatorJS mame2003_plus core */
const MAME_DEFAULT: KeyMapping = {
  up: "↑", upAction: "Up",
  down: "↓", downAction: "Down",
  left: "←", leftAction: "Left",
  right: "→", rightAction: "Right",
  a: "Z", aAction: "Fire",
  b: "X", bAction: "Alt Fire",
  start: "Enter", startAction: "Start",
  select: "Shift", selectAction: "Select",
  extras: [{ label: "Coin", key: "1", action: "Insert Coin" }],
};

/** NES / Famicom mapping (fceumm core) */
const NES_DEFAULT: KeyMapping = {
  up: "↑", upAction: "Up",
  down: "↓", downAction: "Down",
  left: "←", leftAction: "Left",
  right: "→", rightAction: "Right",
  a: "X", aAction: "Action",
  b: "Z", bAction: "Jump",
  start: "Enter", startAction: "Start",
  select: "Shift", selectAction: "Select",
};

/** Sega Mega Drive / Genesis mapping (picodrive / genesis_plus_gx) */
const SEGA_DEFAULT: KeyMapping = {
  up: "↑", upAction: "Up",
  down: "↓", downAction: "Down",
  left: "←", leftAction: "Left",
  right: "→", rightAction: "Right",
  a: "Z", aAction: "Attack",
  b: "X", bAction: "Jump",
  start: "Enter", startAction: "Start",
  select: "Shift", selectAction: "Select",
  extras: [{ label: "C", key: "C", action: "Special" }],
};

/** Space Cadet Pinball (custom) */
const PINBALL: KeyMapping = {
  up: "↑", upAction: "Nudge Up",
  down: "↓", downAction: "Plunger",
  left: "Z", leftAction: "Left Flipper",
  right: "/", rightAction: "Right Flipper",
  a: "Space", aAction: "Launch Ball",
  b: "X", bAction: "Nudge",
  start: "F2", startAction: "New Game",
  select: "Esc", selectAction: "Pause",
};

/**
 * Per-game overrides keyed by game slug.
 * Falls back to core-based defaults when not present.
 */
const GAME_OVERRIDES: Record<string, Partial<KeyMapping>> = {
  "space-cadet": {
    ...PINBALL,
  },
  outrun: {
    a: "Z", aAction: "Accelerate",
    b: "X", bAction: "Brake",
    leftAction: "Steer Left",
    rightAction: "Steer Right",
    extras: [
      { label: "Coin", key: "1", action: "Insert Coin" },
      { label: "Gear", key: "A", action: "Shift Gear" },
    ],
  },
  dkong: {
    aAction: "Jump",
    bAction: "Hammer",
  },
  "metal-slug": {
    aAction: "Shoot",
    bAction: "Jump",
  },
  contra: {
    aAction: "Shoot",
    bAction: "Jump",
  },
  rtype: {
    aAction: "Fire",
    bAction: "Beam",
  },
  inthunt: {
    aAction: "Fire",
    bAction: "Torpedo",
  },
  opwolf: {
    aAction: "Shoot",
    bAction: "Grenade",
  },
  mspacman: {
    upAction: "Up",
    downAction: "Down",
    leftAction: "Left",
    rightAction: "Right",
    aAction: "N/A",
    bAction: "N/A",
  },
  tetris: {
    aAction: "Rotate",
    bAction: "Drop",
    leftAction: "Move Left",
    rightAction: "Move Right",
    downAction: "Soft Drop",
    upAction: "Hard Drop",
  },
  sonic: {
    aAction: "Jump",
    bAction: "Spin",
  },
};

/** Map core names to default mappings */
const CORE_DEFAULTS: Record<string, KeyMapping> = {
  mame2003_plus: MAME_DEFAULT,
  fceumm: NES_DEFAULT,
  segaMD: SEGA_DEFAULT,
  custom: PINBALL,
};

/**
 * Get the key mapping for a specific game (hardcoded defaults + overrides).
 */
export function getKeyMapping(gameSlug: string, core: string): KeyMapping {
  const base = CORE_DEFAULTS[core] ?? MAME_DEFAULT;
  const overrides = GAME_OVERRIDES[gameSlug];
  if (overrides) {
    return { ...base, ...overrides } as KeyMapping;
  }
  return base;
}

/**
 * Get key mapping with optional DB overrides merged on top.
 * DB keymapping takes highest priority, then game overrides, then core defaults.
 */
export function getKeyMappingWithDb(
  gameSlug: string,
  core: string,
  dbKeymapping?: DbKeymapping | null
): KeyMapping {
  const base = getKeyMapping(gameSlug, core);

  if (!dbKeymapping) return base;

  const result = { ...base };
  const buttons = ["up", "down", "left", "right", "a", "b", "start", "select"] as const;

  for (const btn of buttons) {
    const dbEntry = dbKeymapping[btn];
    if (dbEntry) {
      if (dbEntry.key != null && dbEntry.key !== "") result[btn] = dbEntry.key;
      if (dbEntry.action != null && dbEntry.action !== "") {
        result[`${btn}Action`] = dbEntry.action;
      }
    }
  }

  if (dbKeymapping.extras && dbKeymapping.extras.length > 0) {
    // Filter out mouse-click entries — not useful for keyboard/gamepad help
    const MOUSE_KEYS = ["l-click", "r-click", "m-click", "mouse"];
    result.extras = dbKeymapping.extras
      .filter((e) => !MOUSE_KEYS.includes(e.key.toLowerCase()))
      .map((e) => ({
        label: e.action || e.key,
        key: e.key,
        action: e.action,
      }));
    if (result.extras.length === 0) delete result.extras;
  }

  return result;
}
