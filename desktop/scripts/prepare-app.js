// Copia a interface do Aura Pad (raiz do repositório) e todos os sons para desktop/app antes de empacotar.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..'), out = path.join(__dirname, '..', 'app');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const arquivos = ['index.html', 'style.css', 'app.js', 'knob.js', 'stagelab.js', 'pager.js', 'licenca.js', 'catalog.json', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-512.png'];
for (const f of arquivos) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const d of ['audio', 'sf']) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
// o app instalado não usa service worker (já está tudo no disco)
let n = 0; (function conta(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? conta(path.join(d, e.name)) : n++; })(out);
console.log('app preparado em', out, '·', n, 'arquivos');
