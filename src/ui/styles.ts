const CSS = `
.vm3d-root{position:relative;overflow:hidden;outline:none;font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--vm3d-fg);
  --vm3d-bg:rgba(255,255,255,.92);--vm3d-fg:#1d2128;--vm3d-muted:#6b7280;--vm3d-border:rgba(0,0,0,.1);--vm3d-accent:#2563eb;--vm3d-accent-fg:#fff;--vm3d-radius:10px;--vm3d-shadow:0 6px 24px rgba(0,0,0,.14)}
.vm3d-root *{box-sizing:border-box}
.vm3d-root:focus-visible{box-shadow:inset 0 0 0 2px var(--vm3d-accent)}
.vm3d-panel{position:absolute;background:var(--vm3d-bg);backdrop-filter:blur(8px);border:1px solid var(--vm3d-border);border-radius:var(--vm3d-radius);box-shadow:var(--vm3d-shadow);z-index:2;max-height:calc(100% - 24px);display:flex;flex-direction:column}
.vm3d-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;font-weight:600;cursor:pointer;user-select:none}
.vm3d-panel-body{padding:0 10px 10px;overflow:auto}
.vm3d-panel.collapsed .vm3d-panel-body{display:none}
.vm3d-chev{transition:transform .2s;color:var(--vm3d-muted)}
.vm3d-panel.collapsed .vm3d-chev{transform:rotate(-90deg)}
.vm3d-toolbar{top:12px;left:12px;flex-direction:row;align-items:center;gap:2px;padding:4px;transition:opacity .25s}
.vm3d-toolbar.idle{opacity:.4}
.vm3d-toolbar:hover{opacity:1}
.vm3d-btn{appearance:none;border:1px solid var(--vm3d-border);background:#fff;color:var(--vm3d-fg);border-radius:8px;padding:6px 10px;font:inherit;cursor:pointer;white-space:nowrap}
.vm3d-btn:hover{border-color:var(--vm3d-accent)}
.vm3d-btn:disabled{opacity:.4;cursor:default}
.vm3d-btn-ghost{border-color:transparent;background:transparent}
.vm3d-btn-primary{background:var(--vm3d-accent);color:var(--vm3d-accent-fg);border-color:var(--vm3d-accent)}
.vm3d-btn-danger{color:#c62828}
.vm3d-mode{top:12px;right:12px;flex-direction:row;padding:4px;gap:4px}
.vm3d-mode .vm3d-btn.active{background:var(--vm3d-accent);color:var(--vm3d-accent-fg);border-color:var(--vm3d-accent)}
.vm3d-side{right:12px;top:60px;width:250px}
.vm3d-side2{left:12px;top:60px;width:240px}
.vm3d-menu{width:230px;z-index:3}
.vm3d-field{display:flex;flex-direction:column;gap:3px;margin:6px 0}
.vm3d-field>span{font-size:11px;color:var(--vm3d-muted);text-transform:uppercase;letter-spacing:.04em}
.vm3d-row{display:flex;gap:6px}
.vm3d-row>*{flex:1;min-width:0}
.vm3d-input{width:100%;border:1px solid var(--vm3d-border);border-radius:7px;padding:6px 8px;font:inherit;background:#fff;color:var(--vm3d-fg)}
.vm3d-input[type=color]{padding:2px;height:32px}
.vm3d-readonly{font-family:ui-monospace,Consolas,monospace;font-size:12px;color:var(--vm3d-muted)}
.vm3d-types{display:flex;flex-direction:column;gap:4px}
.vm3d-type{display:flex;align-items:center;gap:8px;padding:5px 6px;border-radius:7px;cursor:pointer}
.vm3d-type:hover,.vm3d-type.sel{background:rgba(37,99,235,.08)}
.vm3d-swatch{width:22px;height:22px;border-radius:5px;flex:none;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;text-shadow:0 0 2px #000}
.vm3d-type-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vm3d-type-shape{font-size:11px;color:var(--vm3d-muted)}
.vm3d-overlay{position:absolute;inset:0;background:rgba(10,12,16,.35);display:flex;align-items:center;justify-content:center;z-index:10}
.vm3d-dialog{background:#fff;border-radius:12px;box-shadow:var(--vm3d-shadow);padding:16px;min-width:260px;max-width:min(380px,calc(100% - 32px))}
.vm3d-dialog-title{font-weight:700;font-size:15px;margin-bottom:6px}
.vm3d-dialog-msg{margin:0 0 8px}
.vm3d-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
.vm3d-codes{display:flex;flex-wrap:wrap;gap:4px;max-height:120px;overflow:auto}
.vm3d-code{font-family:ui-monospace,Consolas,monospace;background:#f1f3f5;border-radius:5px;padding:2px 6px}
.vm3d-toast{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:#1d2128;color:#fff;padding:8px 14px;border-radius:8px;z-index:11;box-shadow:var(--vm3d-shadow);max-width:calc(100% - 32px)}
.vm3d-money{right:12px;top:60px;width:210px}
.vm3d-bills{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.vm3d-balance{font-family:ui-monospace,Consolas,monospace;font-size:18px;font-weight:700;margin:8px 0;text-align:center}
.vm3d-hint{font-size:11px;color:var(--vm3d-muted);margin-top:6px}
@media (max-width:640px){
  .vm3d-side,.vm3d-side2,.vm3d-money{top:auto;bottom:12px;left:12px;right:12px;width:auto;max-height:45%}
  .vm3d-side2{display:none}
  .vm3d-toolbar{overflow-x:auto;max-width:calc(100% - 170px)}
}
`;

let injected = false;
export function ensureStyles(): void {
  if (injected || typeof document === 'undefined') return;
  injected = true;
  const s = document.createElement('style');
  s.setAttribute('data-vm3d', '');
  s.textContent = CSS;
  document.head.appendChild(s);
}
