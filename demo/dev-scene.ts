import { createVendingMachine } from '../src/index';
import xml from './sample.xml?raw';

const vm = createVendingMachine(document.getElementById('app')!, { xml, mode: 'play' });
(window as any).vm = vm;
vm.on('purchase', (e) => console.log('purchase', JSON.stringify(e)));
document.getElementById('small')!.onclick = () => void vm.edit.resizeGrid(4, 6);
document.getElementById('big')!.onclick = () => vm.load(xml);
