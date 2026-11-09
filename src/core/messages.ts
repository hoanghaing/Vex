export interface Messages {
  led: {
    welcome: string;
    invalid: string;
    soldOut: string;
    missing: string;   // {v}
    change: string;    // {v}
    price: string;     // {v}
    balance: string;   // {v}
    dispensing: string;
    refund: string;    // {v}
  };
  ui: Record<string, string>;
}

export const DEFAULT_MESSAGES: Messages = {
  led: {
    welcome: 'MOI CHON HANG',
    invalid: 'MA SAI',
    soldOut: 'HET HANG',
    missing: 'THIEU {v}',
    change: 'TIEN THOI {v}',
    price: 'GIA {v}',
    balance: 'SO DU {v}',
    dispensing: 'DANG TRA HANG',
    refund: 'TRA LAI {v}',
  },
  ui: {
    edit: 'Chỉnh sửa',
    play: 'Mua hàng',
    newMachine: 'Mới',
    open: 'Mở XML',
    download: 'Tải XML',
    settings: 'Cài đặt máy',
    undo: 'Hoàn tác',
    redo: 'Làm lại',
    itemTypes: 'Loại hàng',
    addItemType: '+ Loại mới',
    slot: 'Khe',
    empty: '(Trống)',
    itemType: 'Loại hàng',
    price: 'Giá',
    stock: 'Tồn kho',
    position: 'Vị trí (x, y, z)',
    name: 'Tên',
    shape: 'Dạng',
    color: 'Màu',
    labelText: 'Chữ nhãn',
    labelColor: 'Màu chữ',
    rows: 'Số tầng',
    cols: 'Số khe/tầng',
    capacity: 'Sức chứa/khe',
    bodyColor: 'Màu thân',
    accentColor: 'Màu nhấn',
    glass: 'Độ trong kính',
    machineName: 'Tên máy',
    ok: 'Đồng ý',
    cancel: 'Hủy',
    delete: 'Xóa',
    save: 'Lưu',
    refund: 'Trả tiền',
    insert: 'Nạp tiền',
    confirmResize: 'Thu nhỏ lưới sẽ xóa các khe sau:',
    confirmCapacity: 'Giảm sức chứa sẽ cắt tồn kho của các khe:',
    confirmRemoveType: 'Xóa loại hàng sẽ làm trống các khe:',
    newMachineTitle: 'Tạo máy mới',
    loadError: 'Không đọc được file XML',
    shape_can: 'Lon',
    shape_bottle: 'Chai',
    shape_box: 'Hộp',
    shape_bag: 'Túi',
  },
};

export function mergeMessages(over?: { led?: Partial<Messages['led']>; ui?: Record<string, string> }): Messages {
  return {
    led: { ...DEFAULT_MESSAGES.led, ...(over?.led ?? {}) },
    ui: { ...DEFAULT_MESSAGES.ui, ...(over?.ui ?? {}) },
  };
}

export type MoneyFormat = (v: number) => string;
export const defaultFormat: MoneyFormat = (v) => v.toLocaleString('vi-VN');

export function formatMoney(v: number, format: MoneyFormat = defaultFormat): string {
  return format(v);
}

export const fill = (tpl: string, v: string) => tpl.replace('{v}', v);
