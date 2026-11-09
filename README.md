# vending-machine-3d

Máy bán nước tự động **3D** (three.js): **editor** để xếp hàng vào máy và **mô phỏng** mua hàng (thả tiền ảo, bấm mã, hàng rơi xuống khay). Toàn bộ máy được mô tả bằng **một file XML** (ý tưởng từ mxGraph/draw.io): lưu DB được, tải về được, import lại là dựng y nguyên.

- 100% client-side, không cần back-end
- Siêu nhẹ: mọi hình 3D và texture được sinh bằng code, không có file asset. Lõi khoảng **22 KB gzip** (không tính three)
- Dùng được cho **JS thuần** (ESM hoặc 1 thẻ `<script>` UMD) và **Vue 3** (component)

## Cài đặt

```bash
npm i vending-machine-3d three
```

## JS thuần

```js
import { createVendingMachine } from 'vending-machine-3d';

const vm = createVendingMachine(document.getElementById('machine'), {
  xml,                          // tùy chọn: không có thì là máy trống 6×10
  mode: 'edit',                 // 'edit' | 'play'
  denominations: [5000, 10000, 20000],
});

vm.on('change', ({ xml }) => saveToDb(xml));   // mỗi lần editor thay đổi
vm.on('purchase', (e) => console.log(e));      // { code, itemType, price, change }
```

Không cần bundler, chỉ cần một file (đã bundle sẵn three.js):

```html
<div id="machine" style="height:600px"></div>
<script src="https://unpkg.com/vending-machine-3d/dist/vending-machine-3d.umd.js"></script>
<script>
  const vm = VendingMachine3D.createVendingMachine(document.getElementById('machine'), { xml });
</script>
```

## Vue 3

```vue
<script setup>
import { ref } from 'vue';
import { VendingMachine } from 'vending-machine-3d/vue';
const xml = ref(savedXml);
const mode = ref('edit');
</script>

<template>
  <VendingMachine v-model:xml="xml" v-model:mode="mode" @purchase="onBuy" style="height:600px" />
</template>
```

Đăng ký global: `app.use(VendingMachinePlugin)`. Qua `ref` của component có `instance`, `toXML()`, `download()`, `load()`, `insertMoney()`, `press()`, `select()`, `refund()`, `setMode()`.

## Options

| Option | Mặc định | Ý nghĩa |
|---|---|---|
| `xml` | máy trống 6×10 | XML mô tả máy |
| `mode` | `'edit'` | `'edit'` hoặc `'play'` |
| `allowEdit` | `true` | `false`: máy chỉ bán, ẩn toàn bộ UI chỉnh sửa |
| `persistSales` | `!allowEdit` | `true`: bán là trừ kho thật và phát `change`. `false`: Play là sandbox |
| `denominations` | `[1000, 2000, 5000, 10000, 20000, 50000]` | Các mệnh giá tiền ảo |
| `currency` | `vi-VN` | `{ code, format(v) }` |
| `ui` | tất cả bật | `{ toolbar, itemTypePanel, settingsPanel, moneyPanel, modeToggle }` |
| `messages` | tiếng Việt | `{ led: {...}, ui: {...} }` để ghi đè chuỗi hiển thị |

## API

`load(xml)` (ném `VendingXMLError` nếu XML sai, máy giữ nguyên) · `toXML()` · `download(filename)` · `setMode(m)` · `insertMoney(v)` · `press('0'..'9' | 'C' | 'OK')` · `select(code)` · `refund()` · `on/off(event, fn)` · `dispose()`

`vm.edit.*`: `setSlot(code, { itemType, price, stock })`, `clearSlot`, `upsertItemType`, `removeItemType`, `resizeGrid(rows, cols)`, `setCapacity`, `setMeta({ name, theme })`, `newMachine(rows, cols)`, `undo()`, `redo()`

Events: `change`, `purchase`, `error` (`MA_SAI | HET_HANG | THIEU_TIEN`), `warning`, `modechange`, `balance`.

## Định dạng XML (v1)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<vendingMachine version="1" name="Máy sảnh A" rows="6" cols="10" capacity="8">
  <theme body="#c8102e" accent="#1a1a1a" glassOpacity="0.25"/>
  <itemTypes>
    <itemType id="cola" name="Cola" shape="can" color="#d40000" labelText="COLA" labelColor="#ffffff"/>
  </itemTypes>
  <slots>
    <slot code="203" itemType="cola" price="15000" stock="6">
      <position x="-0.17" y="1.182" z="0.263"/>  <!-- chỉ để tham khảo -->
    </slot>
  </slots>
</vendingMachine>
```

- `rows` 4–6, `cols` 6–10 (giá trị ngoài khoảng bị ép về giới hạn và phát `warning`)
- Mã khe = số tầng + số khe 2 chữ số, **tầng 1 ở trên cùng**: `101`…`610`
- `shape`: `can | bottle | box | bag`. Có thể thêm `width/height/depth` (cm), `accentColor`, `model` (để dành cho glTF, hiện được giữ nguyên nhưng chưa render)
- Chỉ ghi khe có hàng. `position` được tính lại khi load
- Đơn vị tiền không nằm trong XML mà do front-end cấu hình

## Phím tắt (khi máy đang focus)

- **Tab**: đổi Edit ⇄ Play · **Esc**: đóng menu khe · **Ctrl+Z / Ctrl+Y**: hoàn tác / làm lại
- Play: **0–9**, **Enter** = OK, **Backspace** = C

## Phát triển

```bash
npm run dev          # demo (Vue) tại demo/
npm test             # Vitest
npm run build        # dist/: ESM + UMD + .d.ts
npm run size         # kiểm tra giới hạn 60 KB gzip
npm run build:demo   # demo-dist/ (index.html + vanilla.html), deploy tĩnh được
```
