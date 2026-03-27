# EmulatorJS Configuration Options Reference

This document contains the full EmulatorJS options API for future reference when implementing game start/end/pause handling, save states, anti-cheat integration, etc.

---

## Core Setup

### `EJS_player`
The selector of the element for the emulator.
- Type: `string`
- Example: `EJS_player = '#game'`

### `EJS_gameUrl`
URL to ROM file.
- Type: `string`
- Example: `EJS_gameUrl = 'someFile.nes'`

### `EJS_core`
Desired target system.
- Type: `string`
- Example: `EJS_core = 'nes'`

### `EJS_pathtodata`
Path to the data folder. Version 4.0+ defaults to the loader.js folder.
- Type: `string`
- Default: `data/`
- Example: `EJS_pathtodata = 'https://cdn.emulatorjs.org/stable/data/'`

### `EJS_biosUrl`
URL to BIOS file.
- Type: `string`
- Default: `''`

### `EJS_gamePatchUrl`
URL to game patch file.
- Type: `string`
- Default: `''`

---

## Game Options

### `EJS_gameName`
Title of the game. Used for save states and screenshots.
- Type: `string`

### `EJS_startOnLoaded`
Start the game when the page loads.
- Type: `boolean`
- Default: `false`

### `EJS_fullscreenOnLoaded`
Start in fullscreen mode.
- Type: `boolean`
- Default: `false`

### `EJS_startButtonName`
Custom text for start button.
- Type: `string`
- Default: `Start Game`

### `EJS_cheats`
Default cheats for cheat manager.
- Type: `array`
- Example: `[["name", "value"], ["name2", "value2"]]`

### `EJS_volume`
Default volume (0=muted, 1=max).
- Type: `number`
- Default: `0.5`

### `EJS_loadStateURL`
URL to save state loaded on game start.
- Type: `string`
- Default: `''`

---

## UI Options

### `EJS_color`
Emulator hex color theme.
- Type: `string`
- Default: `#1AAFFF`

### `EJS_backgroundColor`
Background color of the emulator.
- Type: `string`
- Default: `#333`

### `EJS_backgroundImage`
URL for "Play Now" screen background.
- Type: `string`

### `EJS_backgroundBlur`
Blur background image to fit all aspect ratios.
- Type: `boolean`

### `EJS_alignStartButton`
Align start button: `top`, `center`, `bottom`.
- Type: `string`
- Default: `bottom`

### `EJS_language`
UI language.
- Type: `string`
- Default: `en-US`

### `EJS_disableAutoLang`
Disable automatic language detection.
- Type: `boolean`
- Default: `false`

---

## Button Configuration

### `EJS_Buttons`
Shows/hides buttons. Each can be `boolean` or an object with `visible`, `icon`, `displayName`, `callback`.

Available buttons: `playPause`, `play`, `pause`, `restart`, `mute`, `unmute`, `settings`, `fullscreen`, `enterFullscreen`, `exitFullscreen`, `saveState`, `loadState`, `screenRecord`, `gamepad`, `cheat`, `volume`, `saveSavFiles`, `loadSavFiles`, `quickSave`, `quickLoad`, `screenshot`, `cacheManager`, `exitEmulation`.

Custom buttons can be added with unique names (require `icon`, `displayName`, `callback`).

```js
EJS_Buttons = {
  saveState: {
    visible: true,
    displayName: "Save State",
    callback: () => { console.log("Save state clicked"); }
  },
  customButton: {
    visible: true,
    displayName: "Custom",
    icon: '<svg .../>',
    callback: () => { console.log("Custom clicked"); }
  }
};
```

---

## Callbacks (Important for Future Integration)

### `EJS_ready`
Called when the emulator is ready.
- Type: `function`
- Example: `EJS_ready = function() { console.log("Ready!") }`

### `EJS_onGameStart`
Called when game is started.
- Type: `function`
- **Used for**: Starting contest timers, session tracking.

### `EJS_onSaveState`
Called when save state button pressed.
- Type: `function`
- Arguments: Array containing screenshot and save state.

### `EJS_onLoadState`
Called when load state button pressed.
- Type: `function`

### `EJS_onSaveUpdate`
Called when game save changes (hash comparison).
- Type: `function`
- Arguments: `{ hash, save, screenshot, format }`

---

## Advanced Options

### `EJS_threads`
Run core using threads (may improve performance). Requires COOP/COEP headers.
- Type: `boolean`
- Default: `false`
- Headers needed: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`

### `EJS_videoRotation`
Video rotation: `0` (none), `1` (90°), `2` (180°), `3` (270°).
- Type: `number`
- Default: `0`

### `EJS_CacheLimit`
Game cache limit per ROM in bytes.
- Type: `number`
- Default: `1073741824` (1 GB)

### `EJS_fixedSaveInterval`
Force save flush interval in ms. Disables save interval UI options.
- Type: `number`

### `EJS_externalFiles`
External files for EJS file system.
- Type: `object`
- Example: `{ "/opt/": "/sample.zip" }`

### `EJS_gameParentUrl`
URL to game parent data (additional files for emulation).
- Type: `string`

### `EJS_paths`
Custom paths to EmulatorJS files (for CDN/blob hosting).
- Type: `object`

### `EJS_defaultOptions`
Default settings menu options.
- Type: `object`
- Example: `{ 'shader': 'crt-mattias.glslp', 'save-state-slot': 4 }`

### `EJS_defaultControls`
Default controller mapping. See EmulatorJS docs for full mapping format.
- Type: `object`

### `EJS_VirtualGamepadSettings`
Virtual gamepad button locations.
- Type: `object`

### `EJS_controlScheme`
Control scheme override. Available: `nes`, `gb`, `gba`, `snes`, `n64`, `nds`, `vb`, `segaMD`, `segaCD`, `sega32x`, `segaMS`, `segaGG`, `segaSaturn`, `3do`, `atari2600`, `atari7800`, `lynx`, `jaguar`, `arcade`, `mame`.
- Type: `string`

### `EJS_screenCapture`
Screenshot and video recording settings.
- Type: `object`

---

## Ad Options

### `EJS_AdUrl`
URL to ad page.
- Type: `string`

### `EJS_AdTimer`
Ad duration in ms. `0` disables auto-close, `-1` closes immediately.
- Type: `number`
- Default: `10000`

### `EJS_AdMode`
`0` = start screen only, `1` = loading screen only, `2` = both.
- Type: `number`
- Default: `2`

### `EJS_AdSize`
Ad size as `[width, height]`.
- Type: `array`
- Default: `["300px", "250px"]`

### `EJS_adBlocked`
Function to change/delete adUrl dynamically.
- Type: `function`

---

## Debug Options

### `EJS_DEBUG_XX`
Enable debug mode (verbose logging, unminified scripts).
- Type: `boolean`
- Default: `false`

### `EJS_settingsLanguage`
Enable missing translation logging.
- Type: `boolean`
- Default: `false`

### `EJS_softLoad`
Auto-reset console after x seconds.
- Type: `boolean`
- Default: `false`
