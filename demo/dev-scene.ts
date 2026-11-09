import { SceneHost } from '../src/three/scene';
import { MachineView } from '../src/three/view';
import { parseXML } from '../src/model/xml';
import { resizeGrid } from '../src/model/edit';
import xml from './sample.xml?raw';

const host = new SceneHost(document.getElementById('app')!);
const view = new MachineView(host);
const m = parseXML(xml).model;
view.setModel(m);
view.body!.led.set('MOI CHON HANG');
(window as any).view = view;
document.getElementById('small')!.onclick = () => { view.setModel(resizeGrid(m, 4, 6).model); view.body!.led.set('MOI CHON HANG'); void view.overview(); };
document.getElementById('big')!.onclick = () => { view.setModel(m); view.body!.led.set('MOI CHON HANG'); void view.overview(); };
