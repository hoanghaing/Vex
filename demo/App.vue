<script setup lang="ts">
import { computed, ref } from 'vue';
import { VendingMachine } from '../src/vue';
import type { Mode, PurchaseEvent } from '../src';
import sample from './sample.xml?raw';

const xml = ref(sample);
const mode = ref<Mode>('edit');
const sellOnly = ref(false);
const showXml = ref(false);
const changes = ref(0);
const log = ref<string[]>([]);
const machine = ref<InstanceType<typeof VendingMachine> | null>(null);

const lines = computed(() => xml.value.split('\n').length);
const sizeKb = computed(() => (new Blob([xml.value]).size / 1024).toFixed(1));

function push(msg: string) {
  log.value = [`${new Date().toLocaleTimeString('vi-VN')} · ${msg}`, ...log.value].slice(0, 30);
}
function onPurchase(e: PurchaseEvent) {
  push(`Bán ${e.code} (${e.itemType}) · giá ${e.price.toLocaleString('vi-VN')} · thối ${e.change.toLocaleString('vi-VN')}`);
}
function onChange() {
  changes.value++;
}
function reset() {
  xml.value = sample;
  push('Nạp lại máy mẫu');
}
function copyXml() {
  navigator.clipboard?.writeText(xml.value).then(() => push('Đã copy XML'), () => push('Không copy được'));
}
function toggleSellOnly() {
  sellOnly.value = !sellOnly.value;
  if (sellOnly.value) mode.value = 'play';
  push(sellOnly.value ? 'Máy chỉ bán: bán là trừ kho thật, XML cập nhật' : 'Bật lại chế độ chỉnh sửa (Play = sandbox)');
}
</script>

<template>
  <div class="shell">
    <header class="bar">
      <div class="brand">
        <span class="logo" aria-hidden="true">▣</span>
        <div>
          <h1>Vending Machine 3D</h1>
          <p>three.js · XML · JS thuần &amp; Vue 3</p>
        </div>
      </div>
      <nav class="actions">
        <button :class="{ on: sellOnly }" @click="toggleSellOnly" title="allowEdit = false, persistSales = true">
          {{ sellOnly ? '🔒 Máy chỉ bán' : '🔓 Editor + Play' }}
        </button>
        <button @click="reset">↺ Máy mẫu</button>
        <button :class="{ on: showXml }" @click="showXml = !showXml">&lt;/&gt; XML</button>
        <a href="./vanilla.html" target="_blank" rel="noopener">JS thuần ↗</a>
      </nav>
    </header>

    <main class="stage">
      <VendingMachine
        ref="machine"
        v-model:xml="xml"
        v-model:mode="mode"
        :allow-edit="!sellOnly"
        :denominations="[1000, 2000, 5000, 10000, 20000, 50000]"
        @purchase="onPurchase"
        @change="onChange"
        @warning="(w: string) => push('⚠ ' + w)"
        @error="(e: any) => push(`Lỗi ${e.reason} (${e.code})`)"
        class="machine"
      />

      <aside v-if="showXml" class="drawer">
        <div class="drawer-head">
          <strong>XML trực tiếp</strong>
          <span class="muted">{{ lines }} dòng · {{ sizeKb }} KB · {{ changes }} thay đổi</span>
          <button @click="copyXml">Copy</button>
          <button @click="machine?.download('vending-machine.xml')">Tải về</button>
        </div>
        <textarea readonly :value="xml" spellcheck="false" aria-label="XML"></textarea>
        <div class="log">
          <strong>Sự kiện</strong>
          <p v-if="!log.length" class="muted">Chưa có. Chuyển sang “Mua hàng”, nạp tiền và bấm mã.</p>
          <p v-for="(l, i) in log" :key="i">{{ l }}</p>
        </div>
      </aside>
    </main>

    <footer class="tips">
      <span><b>Chỉnh sửa:</b> click khe để gán hàng · ⚙ cài đặt máy · Ctrl+Z hoàn tác</span>
      <span><b>Mua hàng:</b> nạp tiền → bấm 3 số (vd 203) → OK/Enter · click món trong khay để lấy</span>
      <span><b>Tab</b> đổi chế độ (khi máy đang focus)</span>
    </footer>
  </div>
</template>

<style>
:root {
  --bg: #eef1f5;
  --panel: #ffffff;
  --fg: #1d2128;
  --muted: #6b7280;
  --line: rgba(0, 0, 0, 0.08);
  --accent: #c8102e;
}
* { box-sizing: border-box; }
html, body, #app { margin: 0; height: 100%; }
body { background: var(--bg); color: var(--fg); font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; }
.shell { display: grid; grid-template-rows: auto 1fr auto; height: 100%; }
.bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; background: #15181d; color: #fff; flex-wrap: wrap; }
.brand { display: flex; align-items: center; gap: 10px; }
.brand h1 { margin: 0; font-size: 16px; letter-spacing: 0.02em; }
.brand p { margin: 0; font-size: 12px; color: #9aa3af; }
.logo { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px; background: var(--accent); font-size: 18px; }
.actions { display: flex; gap: 6px; flex-wrap: wrap; }
.actions button, .actions a { appearance: none; border: 1px solid #333a44; background: #1f242b; color: #e5e7eb; border-radius: 8px; padding: 6px 10px; font: inherit; cursor: pointer; text-decoration: none; }
.actions button:hover, .actions a:hover { border-color: #6b7280; }
.actions .on { background: var(--accent); border-color: var(--accent); color: #fff; }
.stage { position: relative; display: flex; min-height: 0; }
.machine { flex: 1; min-width: 0; }
.drawer { width: min(420px, 45vw); display: flex; flex-direction: column; background: var(--panel); border-left: 1px solid var(--line); min-height: 0; }
.drawer-head { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
.drawer-head .muted { flex: 1; font-size: 12px; }
.drawer-head button { border: 1px solid var(--line); background: #fff; border-radius: 6px; padding: 4px 8px; cursor: pointer; font: inherit; }
.drawer textarea { flex: 2; min-height: 0; width: 100%; border: 0; resize: none; padding: 10px; font: 12px/1.5 ui-monospace, Consolas, monospace; color: #374151; background: #fafbfc; outline: none; }
.log { flex: 1; min-height: 0; overflow: auto; padding: 8px 10px; border-top: 1px solid var(--line); font-size: 12px; }
.log p { margin: 2px 0; }
.muted { color: var(--muted); }
.tips { display: flex; gap: 18px; flex-wrap: wrap; padding: 8px 16px; font-size: 12px; color: var(--muted); background: var(--panel); border-top: 1px solid var(--line); }
@media (max-width: 720px) {
  .stage { flex-direction: column; }
  .drawer { width: 100%; height: 45%; border-left: 0; border-top: 1px solid var(--line); }
  .tips { display: none; }
}
</style>
