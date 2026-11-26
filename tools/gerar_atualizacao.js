// AURA Pad · © 2026 Thiago R. Galvão. Todos os direitos reservados. ID: AURA-PD-TRG-2026
// Gera o pacote de atualização assinado (aura-update.json) com a interface atual do AURA Pad (sem os sons: eles ficam no instalador).
// Uso: AURA_UPDATE_KEY="<chave privada PEM>" AURA_BUILD=<número crescente> AURA_VERSAO=1.0.0 node tools/gerar_atualizacao.js [saida.json]
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const raiz = path.join(__dirname, '..');
const chave = process.env.AURA_UPDATE_KEY; if (!chave) { console.error('ERRO: falta o segredo AURA_UPDATE_KEY (chave privada de assinatura).'); process.exit(1); }
const build = parseInt(process.env.AURA_BUILD, 10); if (!(build > 0)) { console.error('ERRO: AURA_BUILD inválido.'); process.exit(1); }
// O texto "o que mudou" vem de desktop/novidades.json (o primeiro item é a versão mais nova). Sem ele não há atualização.
let nov; try { nov = JSON.parse(fs.readFileSync(path.join(raiz, process.env.AURA_NOVIDADES || 'desktop/novidades.json'), 'utf8')); } catch (e) { nov = null; }
if (!Array.isArray(nov) || !nov.length || !nov[0].version || !Array.isArray(nov[0].itens) || !nov[0].itens.length) { console.error('ERRO: desktop/novidades.json precisa ter, no topo, a versão nova com a lista "itens" do que mudou.'); process.exit(1); }
const files = {};
for (const f of ['index.html', 'style.css', 'app.js', 'knob.js', 'stagelab.js', 'pager.js', 'licenca.js', 'update.js', 'catalog.json', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-512.png']) {
  const b = fs.readFileSync(path.join(raiz, f));
  files[f] = { b64: b.toString('base64'), sha256: crypto.createHash('sha256').update(b).digest('hex') };
}
const payload = JSON.stringify({
  build, version: nov[0].version, needsShell: parseInt(process.env.AURA_NEEDS_SHELL || '1', 10),
  notes: nov.slice(0, 10), shell: { version: process.env.AURA_VERSAO || '', url: 'https://github.com/ledixplugins/pad/releases/latest' }, files
});
const sig = crypto.sign(null, Buffer.from(payload), crypto.createPrivateKey(chave)).toString('base64');
const saida = process.argv[2] || 'aura-update.json';
fs.writeFileSync(saida, JSON.stringify({ payload, sig }));
console.log('Pacote ' + saida + ': build ' + build + ', ' + Object.keys(files).length + ' arquivos, ' + Math.round(fs.statSync(saida).size / 1024) + ' KB');
