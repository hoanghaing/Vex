# vending-machine-3d

> Máy bán nước tự động **3D** chạy trên trình duyệt (three.js): vừa là **editor** để xếp hàng vào máy, vừa là **mô phỏng** mua hàng thật: thả tiền ảo, bấm mã trên bàn phím số, xem món hàng rơi xuống khay.
> Toàn bộ máy được mô tả bằng **một file XML**, giống cách mxGraph/draw.io lưu sơ đồ: lưu DB được, tải về được, import lại là dựng y nguyên.

- **100% client-side.** Không cần back-end, hạ tầng hay database. Lưu XML ở đâu là chuyện của bên dùng.
- **Siêu nhẹ.** Mọi hình 3D và texture được sinh bằng code (không có file ảnh hay model), không cần Blender. Lõi khoảng **22 KB gzip** (chưa tính three.js).
- **Một lõi, hai cách dùng.** JS thuần (ESM, hoặc một thẻ `<script>` UMD) và **Vue 3** (component có `v-model`).
- **Animation tự viết.** Camera, lò xo quay, hàng rơi có gia tốc và nảy; không dùng engine vật lý.

---

## Mục lục

- [Tính năng](#tính-năng)
- [Cài đặt](#cài-đặt)
- [Dùng nhanh](#dùng-nhanh): [JS thuần](#js-thuần-esm) · [UMD](#một-thẻ-script-umd) · [Vue 3](#vue-3)
- [Hai chế độ: Edit và Play](#hai-chế-độ-edit-và-play)
- [Options](#options)
- [API](#api)
- [Events](#events)
- [Định dạng XML](#định-dạng-xml-version-1)
- [Phím tắt](#phím-tắt)
- [Tùy biến giao diện](#tùy-biến-giao-diện)
- [Kiến trúc](#kiến-trúc)
- [Phát triển](#phát-triển)
- [Giới hạn đã biết và hướng phát triển](#giới-hạn-đã-biết-và-hướng-phát-triển)
- [Tài liệu liên quan](#tài-liệu-liên-quan)

---

## Tính năng

**Máy**
- Lưới khe tùy chỉnh: **4–6 tầng × 6–10 khe mỗi tầng** (mặc định 6 × 10 = 60 khe). Bề ngang máy co giãn theo số khe.
- Mã khe cố định = số tầng + số khe 2 chữ số, **tầng 1 ở trên cùng**: `101`…`110`, …, `601`…`610`. Tem mã in trên mép kệ.
- Mỗi khe có một lò xo xoắn, sức chứa `capacity` món (mặc định 8, tối đa 12). Vị trí từng món là **preset** theo lưới. Tọa độ x/y/z chỉ hiển thị, không sửa.
- 4 dạng hàng vẽ bằng code: **lon** (`can`), **chai** (`bottle`), **hộp** (`box`), **túi snack** (`bag`). Nhãn (màu, sọc, chữ) được vẽ trên canvas.
- Thân máy gồm mặt kính, header in tên máy, màn LED, bàn phím 3×4 (`1–9`, `C`, `0`, `OK`), khe tiền, nút trả tiền, khay lấy hàng.

**Editor (chế độ Edit)**
- Máy 3D chiếm toàn khung, các panel nổi thu gọn được và toolbar tự mờ khi không dùng.
- Click một khe thì camera zoom vào và hiện **menu nổi**: chọn loại hàng / để trống, đặt giá, tồn kho; tọa độ chỉ đọc.
- **Panel loại hàng:** thêm, sửa, xóa (tên, dạng, màu, chữ nhãn, màu chữ, màu nhấn).
- **Panel cài đặt máy** (nút ⚙): tên máy, số tầng/khe, sức chứa, màu thân, màu nhấn, độ trong của kính.
  - Thu nhỏ lưới mà có khe đang có hàng bị loại ra thì hiện hộp xác nhận liệt kê mã khe.
  - Giảm sức chứa thì tồn kho bị cắt bớt, cũng có xác nhận.
- **Toolbar:** Mới (chọn kích thước lưới) · Mở XML · Tải XML · ⚙ · Hoàn tác / Làm lại (tối đa 50 bước).

**Mô phỏng (chế độ Play)**
- Panel nạp tiền theo các mệnh giá cấu hình sẵn, kèm nút trả tiền.
- Bấm mã trên **bàn phím 3D** (bằng chuột hoặc cảm ứng), bằng bàn phím máy tính, hoặc qua API.
- Kiểm tra theo thứ tự: mã sai (`MA SAI`), hết hàng (`HET HANG`), thiếu tiền (`THIEU 5.000`).
- Hợp lệ thì camera lùi ra, lò xo quay một vòng, món hàng trượt ra, lật, rơi và nảy trong khay. LED hiện `TIEN THOI …` (máy thối toàn bộ số dư sau mỗi lần mua).
- Bàn phím và tiền bị khóa trong lúc hàng đang rơi, nên không thể trừ tiền hai lần.
- Click món trong khay để lấy hàng.
- **Sandbox hoặc lưu thật:** xem `persistSales`.

---

## Cài đặt

```bash
npm i vending-machine-3d three
```

- `three` là peer dependency (`>=0.160`).
- `vue` là peer dependency tùy chọn, chỉ cần khi dùng entry `vending-machine-3d/vue`.

## Dùng nhanh

### JS thuần (ESM)

```js
import { createVendingMachine } from 'vending-machine-3d';

const vm = createVendingMachine(document.getElementById('machine'), {
  xml,                                   // tùy chọn: bỏ trống thì là máy trống 6×10
  mode: 'edit',                          // 'edit' | 'play'
  denominations: [5000, 10000, 20000],
});

vm.on('change', ({ xml }) => saveToDb(xml));     // editor thay đổi → lưu DB
vm.on('purchase', (e) => console.log(e));        // { code, itemType, price, change }
```

Khung chứa cần có chiều cao, ví dụ `#machine { height: 600px }`. Canvas tự co giãn theo khung.

### Một thẻ `<script>` (UMD)

File UMD đã bundle sẵn three.js, không cần bundler:

```html
<div id="machine" style="height:600px"></div>
<script src="https://unpkg.com/vending-machine-3d/dist/vending-machine-3d.umd.js"></script>
<script>
  const vm = VendingMachine3D.createVendingMachine(document.getElementById('machine'), {
    xml,
    allowEdit: false,          // máy chỉ bán
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

- Đăng ký global: `app.use(VendingMachinePlugin)`.
- Qua `ref` của component có `instance` (đối tượng lõi), `toXML()`, `download()`, `load()`, `insertMoney()`, `press()`, `select()`, `refund()`, `setMode()`.
- Emits: `update:xml`, `update:mode`, `change`, `purchase`, `error`, `warning`, `balance`, `ready`.
- Prop `xml` không gây vòng lặp: nếu parent gán lại đúng chuỗi vừa được emit thì máy không load lại.
- Đổi các prop "cấu trúc" (`allowEdit`, `persistSales`, `denominations`, `ui`, `messages`, `currency`) **theo giá trị** thì máy được dựng lại từ XML hiện tại. Mảng hoặc object viết thẳng trong template không gây dựng lại.

---

## Hai chế độ: Edit và Play

| | Edit | Play |
|---|---|---|
| Mục đích | Tạo asset: gán hàng, giá, tồn kho | Mô phỏng mua hàng |
| Chuyển chế độ | Nút ✎ / ▶ ở góc phải, hoặc **Tab** | (như bên trái) |
| Thao tác | Click khe → menu nổi | Nạp tiền → bấm mã → OK |

**`persistSales`, có lưu kết quả bán hay không:**

- `false`, mặc định khi `allowEdit: true`. Play là **sandbox** chạy trên bản sao: quay về Edit thì tồn kho trở lại như cũ, XML không đổi, không phát `change`.
- `true`, mặc định khi `allowEdit: false` (máy chỉ bán). Mỗi lần bán trừ kho thật, `toXML()` phản ánh số đã bán, và phát `change` (Vue phát `update:xml`) để bạn lưu DB. Lần bán **không** phải một bước hoàn tác, nên undo/redo không làm "hồi sinh" hàng đã bán.

---

## Options

| Option | Kiểu | Mặc định | Ý nghĩa |
|---|---|---|---|
| `xml` | `string` | máy trống 6×10 | XML mô tả máy |
| `mode` | `'edit' \| 'play'` | `'edit'` | Chế độ ban đầu (luôn là `'play'` khi `allowEdit: false`) |
| `allowEdit` | `boolean` | `true` | `false` thì máy chỉ bán: ẩn toàn bộ UI chỉnh sửa, `setMode('edit')` bị bỏ qua |
| `persistSales` | `boolean` | `!allowEdit` | Xem mục trên |
| `denominations` | `number[]` | `[1000, 2000, 5000, 10000, 20000, 50000]` | Các mệnh giá tiền ảo |
| `currency` | `{ code, format(v) }` | `vi-VN` (`15.000`) | Cách hiển thị tiền |
| `ui` | `object` | tất cả bật | `{ toolbar, itemTypePanel, settingsPanel, moneyPanel, modeToggle }`; đặt `false` để ẩn từng phần |
| `messages` | `{ led?, ui? }` | tiếng Việt | Ghi đè chuỗi LED / giao diện (xem `DEFAULT_MESSAGES`) |

Chuỗi LED mặc định (không dấu): `MOI CHON HANG`, `MA SAI`, `HET HANG`, `THIEU {v}`, `TIEN THOI {v}`, `SO DU {v}`, `TRA LAI {v}`.

---

## API

```ts
const vm = createVendingMachine(container: HTMLElement, options?: VendingOptions): VendingMachine
```

**Dữ liệu và IO**

| Method / thuộc tính | Mô tả |
|---|---|
| `load(xml)` | Nạp XML. Sai cú pháp thì ném `VendingXMLError` và máy giữ nguyên. Không phát `change` |
| `toXML()` | XML của model editor |
| `download(filename = 'machine.xml')` | Tải file XML về |
| `model` | Model editor (chỉ đọc) |
| `activeModel` | Model đang hiển thị (bản sao khi Play sandbox) |
| `mode` · `setMode(m)` | Chế độ hiện tại / đổi chế độ |
| `dispose()` | Giải phóng WebGL, listener, DOM (gọi nhiều lần không lỗi) |

**Mua hàng** (chỉ có tác dụng ở chế độ Play)

| Method | Mô tả |
|---|---|
| `insertMoney(v)` | Nạp tiền, trả về `false` nếu đang khóa hoặc `v ≤ 0` |
| `press(key)` | `'0'`…`'9'`, `'C'`, `'OK'` |
| `select(code)` | Tương đương nhập mã rồi OK |
| `refund()` | Trả lại số dư, trả về số tiền |
| `balance` · `isDispensing` | Số dư / đang rơi hàng |

**Chỉnh sửa**: `vm.edit.*`, mỗi thay đổi là một bước hoàn tác và phát `change`:

| Method | Mô tả |
|---|---|
| `setSlot(code, { itemType?, price?, stock? })` | Gán hoặc sửa khe (khe mới cần `itemType`) |
| `clearSlot(code)` | Làm trống khe |
| `upsertItemType(type)` | Thêm hoặc sửa loại hàng |
| `removeItemType(id)` → `Promise<boolean>` | Xóa loại hàng (có xác nhận nếu đang dùng) |
| `resizeGrid(rows, cols)` → `Promise<boolean>` | Đổi lưới (có xác nhận nếu làm mất khe) |
| `setCapacity(n)` → `Promise<boolean>` | Đổi sức chứa (có xác nhận nếu cắt tồn kho) |
| `setMeta({ name?, theme? })` | Tên máy, màu, độ trong kính |
| `newMachine(rows, cols)` | Máy trống mới, giữ lại thư viện loại hàng |
| `undo()` · `redo()` · `canUndo` · `canRedo` | Hoàn tác / làm lại |

**Tiện ích xuất ra**: `parseXML`, `serializeXML`, `VendingXMLError`, `DEFAULT_MODEL`, `SHAPE_DEFAULTS`, `LIMITS`, `slotCode`, `parseCode`, `allCodes`, `DEFAULT_MESSAGES`, cùng đầy đủ type (`MachineModel`, `ItemType`, `Slot`, `Theme`, `Shape`, `VendingOptions`, …).

## Events

`vm.on(event, fn)` trả về hàm hủy đăng ký; hoặc dùng `vm.off(event, fn)`.

| Event | Payload | Khi nào |
|---|---|---|
| `change` | `{ xml }` | Editor thay đổi, hoặc bán hàng khi `persistSales: true` |
| `purchase` | `{ code, itemType, price, change }` | Mua thành công |
| `error` | `{ code, reason, missing? }` | `reason`: `MA_SAI` · `HET_HANG` · `THIEU_TIEN` |
| `warning` | `string` | Giá trị bị kẹp, khe/loại hàng không hợp lệ khi load… |
| `modechange` | `'edit' \| 'play'` | Đổi chế độ |
| `balance` | `number` | Số dư thay đổi |

Listener ném lỗi không làm hỏng máy: lỗi được log ra `console.error`.

---

## Định dạng XML (version 1)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<vendingMachine version="1" name="Máy sảnh A" rows="6" cols="10" capacity="8">
  <theme body="#c8102e" accent="#1a1a1a" glassOpacity="0.25"/>
  <itemTypes>
    <itemType id="cola"  name="Cola"      shape="can"    color="#d40000" labelText="COLA" labelColor="#ffffff"/>
    <itemType id="water" name="Nước suối" shape="bottle" color="#bfe4ff" labelText="AQUA" labelColor="#0b5cad" accentColor="#0b5cad"/>
  </itemTypes>
  <slots>
    <slot code="203" itemType="cola" price="15000" stock="6">
      <position x="-0.17" y="1.182" z="0.263"/>  <!-- chỉ để tham khảo -->
    </slot>
  </slots>
</vendingMachine>
```

| Phần tử / thuộc tính | Quy tắc |
|---|---|
| `rows`, `cols` | 4–6, 6–10. Ngoài khoảng thì ép về giới hạn gần nhất và phát `warning` |
| `capacity` | 1–12, mặc định 8 |
| `<theme>` | `body`, `accent` (màu), `glassOpacity` (0–1). Thiếu thì dùng mặc định |
| `<itemType>` | `id` (bắt buộc, duy nhất), `name`, `shape` = `can \| bottle \| box \| bag`, `color`, `labelText`, `labelColor`; tùy chọn `accentColor`, `width` / `height` / `depth` (cm), `model` (để dành cho glTF, được giữ nguyên nhưng chưa render). Thuộc tính lạ được giữ nguyên khi xuất |
| `<slot>` | Chỉ ghi khe **có hàng**. `code` phải hợp lệ với lưới, `itemType` phải tồn tại (không thì bị bỏ qua kèm `warning`). `stock` kẹp vào `0..capacity`; `price` là số nguyên ≥ 0 |
| `<position>` | Chỉ để tham khảo. Khi load, thư viện **luôn tính lại** từ lưới |
| Tiền tệ | Không nằm trong XML; do front-end cấu hình |

Bảo đảm **round-trip**: `parseXML(serializeXML(m)).model` bằng `m`, kể cả với `&`, `<`, `"`, tiếng Việt có dấu, emoji, xuống dòng và tab. Ký tự XML 1.0 không biểu diễn được sẽ bị loại bỏ khi ghi, nên file luôn load lại được.

---

## Phím tắt

Chỉ có tác dụng khi khung máy đang được focus (click vào máy), nên không đụng tới form của trang chủ và nhiều máy trên một trang vẫn chạy độc lập.

| Phím | Chế độ | Tác dụng |
|---|---|---|
| `Tab` | cả hai | Đổi Edit ⇄ Play (`Shift+Tab` để rời khung) |
| `Esc` | Edit | Đóng menu khe |
| `Ctrl+Z` / `Ctrl+Y` (`Ctrl+Shift+Z`) | Edit | Hoàn tác / làm lại |
| `0`–`9` | Play | Nhập mã |
| `Enter` | Play | OK |
| `Backspace` / `Delete` / `C` | Play | Xóa mã đang nhập |

---

## Tùy biến giao diện

Các panel dùng class tiền tố `vm3d-` và CSS variables đặt trên khung chứa (`.vm3d-root`):

```css
#machine {
  --vm3d-accent: #c8102e;
  --vm3d-bg: rgba(20, 22, 26, .9);
  --vm3d-fg: #f3f4f6;
  --vm3d-radius: 6px;
}
```

Biến có sẵn: `--vm3d-bg`, `--vm3d-fg`, `--vm3d-muted`, `--vm3d-border`, `--vm3d-accent`, `--vm3d-accent-fg`, `--vm3d-radius`, `--vm3d-shadow`. Trên màn hình hẹp (≤ 640px), các panel tự chuyển xuống đáy khung.

---

## Kiến trúc

```
src/
  index.ts             createVendingMachine + export công khai
  VendingMachine.ts    controller: model, history, chế độ, sandbox/persist, API, events
  presenter.ts         nối controller ↔ 3D ↔ UI DOM (bỏ qua khi headless)
  model/               TypeScript thuần, không phụ thuộc three/DOM
    types.ts           MachineModel, ItemType, Slot, Theme
    defaults.ts        giới hạn, kích thước mặc định
    grid.ts            mã khe, kẹp lưới, tọa độ preset (hằng số hình học dùng chung)
    xml.ts             parseXML / serializeXML / VendingXMLError
    edit.ts            thao tác thuần (trả model mới, không mutate)
    history.ts         undo/redo dạng snapshot
  vend/machine.ts      máy trạng thái bán hàng (tiền, mã, khóa, thối)
  core/                emitter, chuỗi hiển thị, định dạng tiền
  three/               scene (render-on-demand), body (thân máy), items (4 dạng hàng),
                       textures (canvas), view (đồng bộ model→scene), anim (tween/easing), dispense
  ui/                  panel nổi DOM: toolbar, slotMenu, itemTypePanel, settingsPanel,
                       moneyPanel, modeToggle, dialog, styles
  vue/index.ts         component <VendingMachine> + VendingMachinePlugin
demo/                  trang demo Vue (index.html) + vanilla.html (UMD) + sample.xml
tests/                 Vitest (jsdom), 85 test
```

- **Tách lớp.** `model/` và `vend/` không phụ thuộc three hay DOM nên test được hoàn toàn. Controller chạy được ở chế độ `headless` (không WebGL) để test API.
- **Render-on-demand.** Chỉ vẽ khi có thay đổi, animation hoặc camera đang chuyển động, nên tiết kiệm pin.
- **Dùng chung tài nguyên.** Geometry và material của từng loại hàng được dùng chung và đếm tham chiếu giữa các máy trên cùng trang.

---

## Phát triển

Yêu cầu: Node ≥ 18. Dự án dùng **Vite 6**, vì Vite 8 cần Node ≥ 22.12.

```bash
npm install
npm run dev          # demo (Vue) có hot reload, tại demo/
npm test             # Vitest, 85 test
npx tsc --noEmit     # kiểm tra type
npm run build        # dist/: index.js (ESM), vue.js, vending-machine-3d.umd.js, *.d.ts
npm run size         # kiểm tra giới hạn 60 KB gzip cho lõi
npm run build:demo   # demo-dist/ (index.html + vanilla.html), deploy tĩnh được (GitHub Pages…)
npm run preview      # xem bản demo đã build
```

| File build | Nội dung |
|---|---|
| `dist/index.js` | ESM lõi, three để external (khoảng 22 KB gzip) |
| `dist/vue.js` | Wrapper Vue, import lõi (khoảng 1 KB gzip) |
| `dist/vending-machine-3d.umd.js` | UMD standalone, gồm three.js (khoảng 159 KB gzip), global `VendingMachine3D` |
| `dist/**/*.d.ts` | Type declarations |

---

## Giới hạn đã biết và hướng phát triển

Đã biết, mức nhỏ (ghi lại từ review cuối):

- Bộ nhớ đệm hình 3D lớn dần theo mỗi kiểu dáng mới (màu, nhãn), chỉ được giải phóng khi máy cuối cùng trên trang bị hủy.
- Vật liệu của khung highlight khe không được giải phóng khi hủy.
- Nếu XML được load trong lúc hộp xác nhận thu nhỏ lưới đang mở, danh sách khe đã hiện có thể lệch.
- `edit.*` gọi trong lúc Play sandbox thì không thấy ngay, phải về Edit mới thấy.
- Tiền đã nạp mất đi khi đổi chế độ hoặc load, không phát event trả tiền.
- Thuộc tính lạ có namespace (`x:foo`) không round-trip được.
- Sau `dispose()`, khung chứa vẫn giữ `tabindex` và `position: relative`.
- Giao diện mobile mới có CSS media query, chưa kiểm thử trên thiết bị thật.

Hướng tiếp theo:

- Render model `.glb` khi `itemType` có thuộc tính `model`.
- Kéo-thả loại hàng từ panel vào khe.
- Âm thanh (tiếng lò xo, tiếng rơi) có thể bật/tắt.
- i18n đầy đủ hơn, ví dụ bộ chuỗi tiếng Anh dựng sẵn.

## Tài liệu liên quan

- Thiết kế (spec): [`docs/superpowers/specs/2026-11-09-vending-machine-3d-design.md`](docs/superpowers/specs/2026-11-09-vending-machine-3d-design.md)
- Kế hoạch triển khai: [`docs/superpowers/plans/2026-11-09-vending-machine-3d.md`](docs/superpowers/plans/2026-11-09-vending-machine-3d.md)
- Nhật ký phát triển (quyết định, review, việc còn lại): [`docs/DEVELOPMENT-LOG.md`](docs/DEVELOPMENT-LOG.md)

## License

[MIT](LICENSE)
