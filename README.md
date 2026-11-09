# vending-machine-3d

**English** | [Tiếng Việt](README.vi.md)

> A browser-based **3D vending machine** (three.js) that is both an **editor**, for stocking the machine with products, and a **simulator**, for buying from it like a real one: insert virtual money, type a code on the keypad, and watch the item drop into the tray.
> The whole machine is described by **a single XML file**, the same way mxGraph/draw.io stores diagrams. Store it in a database, download it, import it again and you get exactly the same machine.

- **100% client-side.** No back-end, infrastructure or database. Where you keep the XML is up to you.
- **Ultra lightweight.** Every 3D shape and texture is generated in code (no image or model files, no Blender). The core is about **22 KB gzip**, excluding three.js.
- **One core, two ways to use it.** Plain JS (ESM, or a single UMD `<script>` tag) and **Vue 3** (a component with `v-model`).
- **Hand-written animation.** Camera moves, spinning spiral, items falling with gravity and bouncing; no physics engine.

---

## Table of contents

- [Features](#features)
- [Installation](#installation)
- [Quick start](#quick-start): [Plain JS](#plain-js-esm) · [UMD](#single-script-tag-umd) · [Vue 3](#vue-3)
- [Two modes: Edit and Play](#two-modes-edit-and-play)
- [Options](#options)
- [API](#api)
- [Events](#events)
- [XML format](#xml-format-version-1)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Theming](#theming)
- [Architecture](#architecture)
- [Development](#development)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

**Machine**
- Configurable slot grid: **4–6 rows × 6–10 slots per row** (default 6 × 10 = 60 slots). The machine width scales with the number of slots.
- Fixed slot codes = row number + 2-digit slot number, **row 1 at the top**: `101`…`110`, …, `601`…`610`. Code tags are printed on the shelf edge.
- Each slot has a spiral coil holding up to `capacity` items (default 8, max 12). Item positions are **presets** derived from the grid; x/y/z coordinates are shown read-only, never edited.
- Four product shapes drawn in code: **can**, **bottle**, **box** and **snack bag**. Labels (colour, stripes, text) are painted on a canvas.
- Cabinet with glass front, header with the machine name, LED display, 3×4 keypad (`1–9`, `C`, `0`, `OK`), coin slot, refund button and pickup tray.

**Editor (Edit mode)**
- The 3D machine fills the whole container, with floating panels that collapse and a toolbar that fades when idle.
- Click a slot: the camera zooms in and a **floating menu** opens to pick a product (or leave it empty) and set price and stock. Coordinates are read-only.
- **Item type panel:** add, edit and delete types (name, shape, colour, label text, label colour, accent colour).
- **Machine settings panel** (⚙ button): name, rows/slots, capacity, body colour, accent colour, glass opacity.
  - Shrinking the grid when stocked slots would fall outside it opens a confirmation listing the affected codes.
  - Lowering the capacity trims stock, also after confirmation.
- **Toolbar:** New (choose grid size) · Open XML · Download XML · ⚙ · Undo / Redo (up to 50 steps).

**Simulator (Play mode)**
- Money panel with the configured denominations, plus a refund button.
- Type the code on the **3D keypad** (mouse or touch), on the computer keyboard, or through the API.
- Checks run in order: invalid code (`MA SAI`), sold out (`HET HANG`), insufficient money (`THIEU 5.000`).
- On a valid purchase the camera pulls back, the spiral turns once, and the item slides off, tips over, falls and bounces in the tray. The LED shows the change (`TIEN THOI …`); the full remaining balance is returned after each purchase.
- Keypad and money are locked while an item is falling, so a purchase can never be charged twice.
- Click an item in the tray to take it.
- **Sandbox or persisted sales:** see `persistSales`.

---

## Installation

```bash
npm i vending-machine-3d three
```

- `three` is a peer dependency (`>=0.160`).
- `vue` is an optional peer dependency, needed only for the `vending-machine-3d/vue` entry.

## Quick start

### Plain JS (ESM)

```js
import { createVendingMachine } from 'vending-machine-3d';

const vm = createVendingMachine(document.getElementById('machine'), {
  xml,                                   // optional: an empty 6×10 machine if omitted
  mode: 'edit',                          // 'edit' | 'play'
  denominations: [5000, 10000, 20000],
});

vm.on('change', ({ xml }) => saveToDb(xml));     // editor changed → save it
vm.on('purchase', (e) => console.log(e));        // { code, itemType, price, change }
```

The container needs a height, e.g. `#machine { height: 600px }`. The canvas resizes with it.

### Single `<script>` tag (UMD)

The UMD file bundles three.js, so no bundler is needed:

```html
<div id="machine" style="height:600px"></div>
<script src="https://unpkg.com/vending-machine-3d/dist/vending-machine-3d.umd.js"></script>
<script>
  const vm = VendingMachine3D.createVendingMachine(document.getElementById('machine'), {
    xml,
    allowEdit: false,          // sell-only machine
  });
</script>
```

### Vue 3

```vue
<script setup>
import { ref } from 'vue';
import { VendingMachine } from 'vending-machine-3d/vue';

const xml = ref(savedXml);
const mode = ref('edit');
const denominations = [1000, 2000, 5000, 10000, 20000, 50000];
</script>

<template>
  <VendingMachine
    v-model:xml="xml"
    v-model:mode="mode"
    :denominations="denominations"
    @purchase="onBuy"
    style="height: 600px"
  />
</template>
```

- Global registration: `app.use(VendingMachinePlugin)`.
- Through the component `ref` you get `instance` (the core object), `toXML()`, `download()`, `load()`, `insertMoney()`, `press()`, `select()`, `refund()` and `setMode()`.
- Emits: `update:xml`, `update:mode`, `change`, `purchase`, `error`, `warning`, `balance`, `ready`.
- The `xml` prop never causes a loop: if the parent passes back the exact string that was just emitted, the machine does not reload.
- Changing a "structural" prop (`allowEdit`, `persistSales`, `denominations`, `ui`, `messages`, `currency`) **by value** rebuilds the machine from its current XML. Inline arrays or objects in the template do not trigger a rebuild.

---

## Two modes: Edit and Play

| | Edit | Play |
|---|---|---|
| Purpose | Build the asset: products, prices, stock | Simulate buying |
| Switch | ✎ / ▶ buttons at the top right, or **Tab** | (same) |
| Interaction | Click a slot → floating menu | Insert money → type code → OK |

**`persistSales`: whether sales are kept**

- `false`, the default when `allowEdit: true`. Play is a **sandbox** running on a copy: going back to Edit restores the stock, the XML is unchanged and no `change` is emitted.
- `true`, the default when `allowEdit: false` (sell-only machine). Every sale really reduces stock, `toXML()` reflects it, and `change` is emitted (`update:xml` in Vue) so you can save it. A sale is **not** an undo step, so undo/redo never brings sold items back.

---

## Options

| Option | Type | Default | Meaning |
|---|---|---|---|
| `xml` | `string` | empty 6×10 machine | XML describing the machine |
| `mode` | `'edit' \| 'play'` | `'edit'` | Initial mode (always `'play'` when `allowEdit: false`) |
| `allowEdit` | `boolean` | `true` | `false` makes a sell-only machine: all editing UI is hidden and `setMode('edit')` is ignored |
| `persistSales` | `boolean` | `!allowEdit` | See above |
| `denominations` | `number[]` | `[1000, 2000, 5000, 10000, 20000, 50000]` | Virtual money denominations |
| `currency` | `{ code, format(v) }` | `vi-VN` (`15.000`) | How money is displayed |
| `ui` | `object` | all on | `{ toolbar, itemTypePanel, settingsPanel, moneyPanel, modeToggle }`; set `false` to hide a part |
| `messages` | `{ led?, ui? }` | Vietnamese | Override LED / UI strings (see `DEFAULT_MESSAGES`) |

Default LED strings (Vietnamese, without diacritics): `MOI CHON HANG` (please choose), `MA SAI` (invalid code), `HET HANG` (sold out), `THIEU {v}` (missing), `TIEN THOI {v}` (change), `SO DU {v}` (balance), `TRA LAI {v}` (refund). The UI labels default to Vietnamese too; for an English UI, override them:

```js
createVendingMachine(el, {
  messages: {
    led: { welcome: 'SELECT ITEM', invalid: 'INVALID', soldOut: 'SOLD OUT', missing: 'NEED {v}', change: 'CHANGE {v}', balance: 'CREDIT {v}', refund: 'REFUND {v}' },
    ui: { edit: 'Edit', play: 'Buy', price: 'Price', stock: 'Stock', refund: 'Refund' /* … */ },
  },
  currency: { code: 'USD', format: (v) => `$${(v / 100).toFixed(2)}` },
});
```

---

## API

```ts
const vm = createVendingMachine(container: HTMLElement, options?: VendingOptions): VendingMachine
```

**Data and IO**

| Method / property | Description |
|---|---|
| `load(xml)` | Load XML. Throws `VendingXMLError` on invalid XML and keeps the current machine. Does not emit `change` |
| `toXML()` | XML of the editor model |
| `download(filename = 'machine.xml')` | Download the XML file |
| `model` | Editor model (read-only) |
| `activeModel` | Model being displayed (the copy in Play sandbox) |
| `mode` · `setMode(m)` | Current mode / switch mode |
| `dispose()` | Release WebGL, listeners and DOM (safe to call twice) |

**Buying** (only effective in Play mode)

| Method | Description |
|---|---|
| `insertMoney(v)` | Insert money; returns `false` if locked or `v ≤ 0` |
| `press(key)` | `'0'`…`'9'`, `'C'`, `'OK'` |
| `select(code)` | Same as typing the code and pressing OK |
| `refund()` | Return the balance; returns the amount |
| `balance` · `isDispensing` | Current balance / an item is falling |

**Editing**: `vm.edit.*`. Each change is one undo step and emits `change`:

| Method | Description |
|---|---|
| `setSlot(code, { itemType?, price?, stock? })` | Assign or update a slot (a new slot needs `itemType`) |
| `clearSlot(code)` | Empty a slot |
| `upsertItemType(type)` | Add or update an item type |
| `removeItemType(id)` → `Promise<boolean>` | Delete an item type (asks for confirmation if in use) |
| `resizeGrid(rows, cols)` → `Promise<boolean>` | Change the grid (asks if slots would be lost) |
| `setCapacity(n)` → `Promise<boolean>` | Change capacity (asks if stock would be trimmed) |
| `setMeta({ name?, theme? })` | Machine name, colours, glass opacity |
| `newMachine(rows, cols)` | New empty machine, keeping the item type library |
| `undo()` · `redo()` · `canUndo` · `canRedo` | Undo / redo |

**Exported utilities:** `parseXML`, `serializeXML`, `VendingXMLError`, `DEFAULT_MODEL`, `SHAPE_DEFAULTS`, `LIMITS`, `slotCode`, `parseCode`, `allCodes`, `DEFAULT_MESSAGES`, plus all types (`MachineModel`, `ItemType`, `Slot`, `Theme`, `Shape`, `VendingOptions`, …).

## Events

`vm.on(event, fn)` returns an unsubscribe function; `vm.off(event, fn)` also works.

| Event | Payload | When |
|---|---|---|
| `change` | `{ xml }` | The editor changed, or a sale happened with `persistSales: true` |
| `purchase` | `{ code, itemType, price, change }` | Successful purchase |
| `error` | `{ code, reason, missing? }` | `reason`: `MA_SAI` (invalid code) · `HET_HANG` (sold out) · `THIEU_TIEN` (insufficient money) |
| `warning` | `string` | Clamped values, invalid slots/types on load… |
| `modechange` | `'edit' \| 'play'` | Mode switched |
| `balance` | `number` | Balance changed |

A listener that throws cannot break the machine; the error is logged with `console.error`.

---

## XML format (version 1)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<vendingMachine version="1" name="Lobby A" rows="6" cols="10" capacity="8">
  <theme body="#c8102e" accent="#1a1a1a" glassOpacity="0.25"/>
  <itemTypes>
    <itemType id="cola"  name="Cola"  shape="can"    color="#d40000" labelText="COLA" labelColor="#ffffff"/>
    <itemType id="water" name="Water" shape="bottle" color="#bfe4ff" labelText="AQUA" labelColor="#0b5cad" accentColor="#0b5cad"/>
  </itemTypes>
  <slots>
    <slot code="203" itemType="cola" price="15000" stock="6">
      <position x="-0.17" y="1.182" z="0.263"/>  <!-- informational only -->
    </slot>
  </slots>
</vendingMachine>
```

| Element / attribute | Rules |
|---|---|
| `rows`, `cols` | 4–6 and 6–10. Out-of-range values are clamped to the nearest limit with a `warning` |
| `capacity` | 1–12, default 8 |
| `<theme>` | `body`, `accent` (colours), `glassOpacity` (0–1). Defaults are used if missing |
| `<itemType>` | `id` (required, unique), `name`, `shape` = `can \| bottle \| box \| bag`, `color`, `labelText`, `labelColor`; optional `accentColor`, `width` / `height` / `depth` (cm), `model` (reserved for glTF: preserved but not rendered yet). Unknown attributes are preserved on export |
| `<slot>` | Only **stocked** slots are written. `code` must fit the grid and `itemType` must exist; otherwise the slot is skipped with a `warning`. `stock` is clamped to `0..capacity`; `price` is an integer ≥ 0 |
| `<position>` | Informational only. On load the library **always recomputes** it from the grid |
| Currency | Not part of the XML; configured by the front-end |

**Round-trip guarantee:** `parseXML(serializeXML(m)).model` equals `m`, including `&`, `<`, `"`, Vietnamese diacritics, emoji, newlines and tabs. Characters that XML 1.0 cannot represent are dropped when writing, so the file always loads again.

---

## Keyboard shortcuts

Active only while the machine container has focus (click the machine). They never interfere with forms on the host page, and several machines on one page work independently.

| Key | Mode | Action |
|---|---|---|
| `Tab` | both | Toggle Edit ⇄ Play (`Shift+Tab` leaves the container) |
| `Esc` | Edit | Close the slot menu |
| `Ctrl+Z` / `Ctrl+Y` (`Ctrl+Shift+Z`) | Edit | Undo / redo |
| `0`–`9` | Play | Type the code |
| `Enter` | Play | OK |
| `Backspace` / `Delete` / `C` | Play | Clear the typed code |

---

## Theming

Panels use `vm3d-` prefixed classes and CSS variables set on the container (`.vm3d-root`):

```css
#machine {
  --vm3d-accent: #c8102e;
  --vm3d-bg: rgba(20, 22, 26, .9);
  --vm3d-fg: #f3f4f6;
  --vm3d-radius: 6px;
}
```

Available variables: `--vm3d-bg`, `--vm3d-fg`, `--vm3d-muted`, `--vm3d-border`, `--vm3d-accent`, `--vm3d-accent-fg`, `--vm3d-radius`, `--vm3d-shadow`. On narrow screens (≤ 640px) the panels move to the bottom of the container.

---

## Architecture

```
src/
  index.ts             createVendingMachine + public exports
  VendingMachine.ts    controller: model, history, modes, sandbox/persist, API, events
  presenter.ts         wires controller ↔ 3D ↔ DOM UI (skipped when headless)
  model/               pure TypeScript, no three/DOM dependency
    types.ts           MachineModel, ItemType, Slot, Theme
    defaults.ts        limits, default sizes
    grid.ts            slot codes, grid clamping, preset positions (shared geometry constants)
    xml.ts             parseXML / serializeXML / VendingXMLError
    edit.ts            pure operations (return a new model, never mutate)
    history.ts         snapshot-based undo/redo
  vend/machine.ts      vending state machine (money, code, lock, change)
  core/                emitter, display strings, money formatting
  three/               scene (render-on-demand), body (cabinet), items (4 shapes),
                       textures (canvas), view (model → scene sync), anim (tween/easing), dispense
  ui/                  floating DOM panels: toolbar, slotMenu, itemTypePanel, settingsPanel,
                       moneyPanel, modeToggle, dialog, styles
  vue/index.ts         <VendingMachine> component + VendingMachinePlugin
demo/                  Vue demo (index.html) + vanilla.html (UMD) + sample.xml
tests/                 Vitest (jsdom), 85 tests
```

- **Layered.** `model/` and `vend/` have no three/DOM dependency and are fully unit-tested. The controller runs `headless` (no WebGL) so the API is testable too.
- **Render-on-demand.** The scene renders only on changes, animations or camera movement, which saves battery.
- **Shared resources.** Each item type's geometry and materials are shared and reference-counted across machines on the same page.

---

## Development

Requires Node ≥ 18. The project uses **Vite 6**, because Vite 8 requires Node ≥ 22.12.

```bash
npm install
npm run dev          # Vue demo with hot reload, from demo/
npm test             # Vitest, 85 tests
npx tsc --noEmit     # type check
npm run build        # dist/: index.js (ESM), vue.js, vending-machine-3d.umd.js, *.d.ts
npm run size         # enforce the 60 KB gzip limit for the core
npm run build:demo   # demo-dist/ (index.html + vanilla.html), deployable as static files (GitHub Pages…)
npm run preview      # preview the built demo
```

| Build file | Contents |
|---|---|
| `dist/index.js` | Core ESM, three external (~22 KB gzip) |
| `dist/vue.js` | Vue wrapper, imports the core (~1 KB gzip) |
| `dist/vending-machine-3d.umd.js` | Standalone UMD including three.js (~159 KB gzip), global `VendingMachine3D` |
| `dist/**/*.d.ts` | Type declarations |

---

## Roadmap

- Render `.glb` models when an `itemType` has a `model` attribute.
- Drag and drop item types from the panel onto slots.
- Optional sound effects (spiral, drop).
- A ready-made English string set.

## License

[MIT](LICENSE)
