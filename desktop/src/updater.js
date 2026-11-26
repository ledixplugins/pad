// Atualização do app sem reinstalar: baixa a interface nova (um pacote assinado), confere a assinatura e guarda ao lado do app.
// © 2026 Thiago R. Galvão. Todos os direitos reservados. ID: AURA-PD-TRG-2026
const crypto = require('crypto'), fs = require('fs'), path = require('path');

const OK_NOME = /^[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)*$/;     // só nomes simples, sem "..", sem caminho absoluto

// Confere a assinatura do pacote e a integridade de cada arquivo. Devolve o conteúdo (objeto) ou null.
function verificar(texto, chavePublica) {
  try {
    const m = JSON.parse(texto);
    if (typeof m.payload !== 'string' || typeof m.sig !== 'string') return null;
    if (!crypto.verify(null, Buffer.from(m.payload), chavePublica, Buffer.from(m.sig, 'base64'))) return null;
    const p = JSON.parse(m.payload);
    if (!Number.isInteger(p.build) || !p.files || typeof p.files !== 'object') return null;
    for (const [nome, f] of Object.entries(p.files)) {
      if (!OK_NOME.test(nome) || nome.split('/').includes('..')) return null;
      const b = Buffer.from(f.b64, 'base64');
      if (crypto.createHash('sha256').update(b).digest('hex') !== f.sha256) return null;
    }
    return p;
  } catch (e) { return null; }
}

const lerJ = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const gravarJ = (f, j) => { fs.mkdirSync(path.dirname(f), { recursive: true }); const t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(j)); fs.renameSync(t, f); };

// Pasta da interface atualizada que deve ser usada agora (ou null = usar a que veio no instalador).
// Regras de segurança: reconfere a assinatura a cada abertura; se a abertura anterior com esta versão nunca chegou a
// funcionar (3 aberturas seguidas sem confirmar), descarta a versão e volta para a do instalador.
function raizAtiva(base, chavePublica, shellApi) {
  const cur = lerJ(path.join(base, 'atual.json')); if (!cur || !cur.build) return null;
  if ((cur.tentativas || 0) >= 3) { gravarJ(path.join(base, 'atual.json'), { build: 0, ruins: (cur.ruins || []).concat(cur.build) }); return null; }
  const dir = path.join(base, String(cur.build));
  let txt; try { txt = fs.readFileSync(path.join(dir, 'pacote.json'), 'utf8'); } catch (e) { return null; }
  const p = verificar(txt, chavePublica); if (!p || p.build !== cur.build || (p.needsShell || 0) > shellApi) return null;
  gravarJ(path.join(base, 'atual.json'), Object.assign({}, cur, { tentativas: (cur.tentativas || 0) + 1 }));
  return { dir, build: p.build, version: p.version || '' };
}
function confirmarInicio(base) { const cur = lerJ(path.join(base, 'atual.json')); if (cur && cur.tentativas) { delete cur.tentativas; gravarJ(path.join(base, 'atual.json'), cur); } }

const partes = v => String(v || '0').split('.').map(n => parseInt(n, 10) || 0);
function compararVersao(a, b) { const x = partes(a), y = partes(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; } return 0; }

// Procura uma versão nova (só olha; NÃO baixa nem aplica nada: quem decide é o usuário).
// `buscar(url)` devolve o texto do pacote. `versaoAtual`: versão da interface em uso (para mostrar só o que é novo).
// Resultado: {estado:'nenhuma'} | {estado:'disponivel', build, version, notas:[{version,date,titulo,itens[]}], texto} | {estado:'programa', ...} | {estado:'erro'}
async function procurar({ url, buscar, base, chavePublica, shellApi, buildAtual, versaoAtual }) {
  let txt; try { txt = await buscar(url); } catch (e) { return { estado: 'erro', motivo: 'offline' }; }
  const p = verificar(txt, chavePublica); if (!p) return { estado: 'erro', motivo: 'assinatura' };
  const cur = lerJ(path.join(base, 'atual.json')) || {};
  if (p.build <= Math.max(buildAtual || 0, cur.build || 0) || (cur.ruins || []).includes(p.build)) return { estado: 'nenhuma' };
  const todas = Array.isArray(p.notes) ? p.notes : [];
  let notas = todas.filter(n => n && compararVersao(n.version, versaoAtual) > 0);
  if (!notas.length) notas = todas.slice(0, 1);                       // nunca mostra uma atualização sem dizer o que mudou
  const r = { build: p.build, version: p.version || '', notas, texto: txt, shell: p.shell || {} };
  if ((p.needsShell || 0) > shellApi) return Object.assign(r, { estado: 'programa' });
  return Object.assign(r, { estado: 'disponivel' });
}

// Instala a versão escolhida pelo usuário (confere tudo de novo) e a torna a versão em uso. Devolve true/false.
function instalar({ texto, base, chavePublica, shellApi }) {
  const p = verificar(texto, chavePublica); if (!p || (p.needsShell || 0) > shellApi) return false;
  const cur = lerJ(path.join(base, 'atual.json')) || {};
  const dir = path.join(base, String(p.build));
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for (const [nome, f] of Object.entries(p.files)) { const d = path.join(dir, nome); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, Buffer.from(f.b64, 'base64')); }
  fs.writeFileSync(path.join(dir, 'pacote.json'), texto);
  gravarJ(path.join(base, 'atual.json'), { build: p.build, ruins: cur.ruins || [] });
  if (cur.build && cur.build !== p.build) fs.rmSync(path.join(base, String(cur.build)), { recursive: true, force: true });   // só agora a versão anterior sai
  return true;
}
module.exports = { verificar, raizAtiva, confirmarInicio, procurar, instalar, compararVersao };
