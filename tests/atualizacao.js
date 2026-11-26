// AURA Pad — atualização sem reinstalar: assinatura, integridade, versões, "o que mudou", decisão do usuário, reversão e nova instalação.
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const upd = require('../desktop/src/updater');
let falhas = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FALHA ') + m); if (!c) falhas++; };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aura-upd-'));
const par = () => crypto.generateKeyPairSync('ed25519');
const { publicKey, privateKey } = par(), outra = par();
const pub = publicKey.export({ type: 'spki', format: 'pem' }), priv = privateKey.export({ type: 'pkcs8', format: 'pem' });
const gen = path.join(__dirname, '..', 'tools', 'gerar_atualizacao.js');
const NOV = [
  { version: '1.4.0', date: '2026-12-10', titulo: 'Quarta', itens: ['Item da 1.4.0'] },
  { version: '1.3.0', date: '2026-12-01', titulo: 'Terceira', itens: ['Item A da 1.3.0', 'Item B da 1.3.0'] },
  { version: '1.2.0', date: '2026-11-25', titulo: 'Segunda', itens: ['Item da 1.2.0'] }];
function gerar(build, needs, o) {
  o = o || {}; const nf = path.join(tmp, 'nov' + build + '.json'); fs.writeFileSync(nf, JSON.stringify(o.nov || NOV));
  const f = path.join(tmp, 'pk' + build + '.json');
  execFileSync('node', [gen, f], { env: Object.assign({}, process.env, { AURA_UPDATE_KEY: o.chave || priv, AURA_BUILD: String(build), AURA_VERSAO: '1.2.0', AURA_NEEDS_SHELL: String(needs), AURA_NOVIDADES: path.relative(path.join(__dirname, '..'), nf) }), stdio: 'pipe' });
  return fs.readFileSync(f, 'utf8');
}
const assina = (p) => JSON.stringify({ payload: p, sig: crypto.sign(null, Buffer.from(p), privateKey).toString('base64') });
(async () => {
  const p5 = gerar(5, 1); const v = upd.verificar(p5, pub);
  ok(v && v.build === 5 && v.version === '1.4.0' && v.files['index.html'] && v.notes.length === 3, 'pacote assinado é aceito e traz o que mudou');
  ok(!upd.verificar(p5, outra.publicKey.export({ type: 'spki', format: 'pem' })), 'assinatura de outra chave é recusada');
  const m = JSON.parse(p5); const alt = JSON.parse(m.payload); alt.build = 99; ok(!upd.verificar(JSON.stringify({ payload: JSON.stringify(alt), sig: m.sig }), pub), 'pacote alterado depois de assinado é recusado');
  const a2 = JSON.parse(m.payload); a2.files['index.html'].b64 = Buffer.from('<script>mal</script>').toString('base64'); ok(!upd.verificar(assina(JSON.stringify(a2)), pub), 'arquivo que não bate com o hash é recusado');
  const a3 = JSON.parse(m.payload); a3.files['../fora.txt'] = a3.files['index.html']; ok(!upd.verificar(assina(JSON.stringify(a3)), pub), 'nome de arquivo com ".." é recusado');
  ok(!upd.verificar('lixo', pub) && !upd.verificar('{}', pub), 'texto inválido é recusado sem erro');
  let sem = false; try { gerar(6, 1, { nov: [{ version: '9.9.9', itens: [] }] }); } catch (e) { sem = true; }
  ok(sem, 'não gera atualização sem a lista do que mudou');
  ok(upd.compararVersao('1.10.0', '1.9.0') > 0 && upd.compararVersao('1.2.0', '1.2.0') === 0 && upd.compararVersao('1.2', '1.2.1') < 0, 'comparação de versões');

  const base = path.join(tmp, 'web-update'); const buscar = t => async () => t;
  const cfg = (t, extra) => Object.assign({ url: 'x', buscar: buscar(t), base, chavePublica: pub, shellApi: 1, buildAtual: 3, versaoAtual: '1.2.0' }, extra || {});
  let r = await upd.procurar(cfg(p5));
  ok(r.estado === 'disponivel' && r.build === 5 && r.version === '1.4.0', 'versão mais nova é apenas anunciada (disponível)');
  ok(r.notas.map(n => n.version).join() === '1.4.0,1.3.0', 'mostra só o que mudou desde a versão do usuário (1.4.0 e 1.3.0)');
  ok(r.notas[1].itens.length === 2 && r.notas[1].titulo === 'Terceira', 'cada versão traz título e lista de mudanças');
  ok(!fs.existsSync(base) || fs.readdirSync(base).length === 0, 'procurar não baixa nem grava nada: a decisão é do usuário');
  ok(upd.raizAtiva(base, pub, 1) === null, 'sem o clique do usuário, a versão do instalador continua valendo');
  r = await upd.procurar(cfg(p5, { versaoAtual: '1.4.0' })); ok(r.estado === 'disponivel' && r.notas.length === 1, 'se faltar nota nova, ainda mostra a mais recente (nunca atualização sem explicação)');
  ok(upd.instalar({ texto: p5, base, chavePublica: pub, shellApi: 1 }) === true, 'ao clicar em Atualizar, a versão é instalada');
  let a = upd.raizAtiva(base, pub, 1); ok(a && a.build === 5 && a.version === '1.4.0' && a.dir === path.join(base, '5'), 'versão ativa vem da pasta atualizada');
  upd.confirmarInicio(base);
  r = await upd.procurar(cfg(p5, { buildAtual: 5, versaoAtual: '1.4.0' })); ok(r.estado === 'nenhuma', 'mesma versão: nada a mostrar');
  r = await upd.procurar(cfg(gerar(4, 1), { buildAtual: 5 })); ok(r.estado === 'nenhuma', 'versão mais velha é ignorada');
  r = await upd.procurar(cfg(p5, { buscar: async () => { throw new Error('offline'); } })); ok(r.estado === 'erro', 'sem internet: erro tratado, sem aviso na tela');
  r = await upd.procurar(cfg(gerar(7, 2), { buildAtual: 5, versaoAtual: '1.4.0' })); ok(r.estado === 'programa' && r.notas.length >= 1, 'pacote que exige casca maior pede nova instalação, mostrando o que mudou');
  ok(upd.instalar({ texto: gerar(7, 2), base, chavePublica: pub, shellApi: 1 }) === false, 'pacote que exige casca maior nunca é instalado pelo atualizador');
  r = await upd.procurar(cfg(gerar(8, 1, { chave: outra.privateKey.export({ type: 'pkcs8', format: 'pem' }) }), { buildAtual: 5 })); ok(r.estado === 'erro', 'pacote assinado por chave desconhecida é recusado');
  ok(upd.instalar({ texto: p5.replace('"sig":"', '"sig":"AAAA'), base, chavePublica: pub, shellApi: 1 }) === false, 'instalação confere a assinatura de novo');

  const p9 = gerar(9, 1); ok(upd.instalar({ texto: p9, base, chavePublica: pub, shellApi: 1 }) && !fs.existsSync(path.join(base, '5')) && fs.existsSync(path.join(base, '9')), 'ao atualizar, a versão anterior é removida');
  fs.writeFileSync(path.join(base, '9', 'pacote.json'), fs.readFileSync(path.join(base, '9', 'pacote.json'), 'utf8').replace('"sig":"', '"sig":"AAAA'));
  ok(upd.raizAtiva(base, pub, 1) === null, 'pacote adulterado no disco volta para a versão do instalador');
  fs.rmSync(base, { recursive: true, force: true });
  upd.instalar({ texto: gerar(10, 1), base, chavePublica: pub, shellApi: 1 });
  ok(upd.raizAtiva(base, pub, 1) && upd.raizAtiva(base, pub, 1) && upd.raizAtiva(base, pub, 1), '3 aberturas sem confirmar ainda usam a versão nova');
  ok(upd.raizAtiva(base, pub, 1) === null, 'na 4ª abertura sem confirmar, volta para a versão do instalador');
  r = await upd.procurar(cfg(gerar(10, 1))); ok(r.estado === 'nenhuma', 'versão que falhou não é oferecida de novo');
  upd.instalar({ texto: gerar(11, 1), base, chavePublica: pub, shellApi: 1 });
  let tudo = true; for (let i = 0; i < 6; i++) { tudo = tudo && !!upd.raizAtiva(base, pub, 1); upd.confirmarInicio(base); }
  ok(tudo, 'aberturas que chegam a funcionar nunca perdem a versão nova');
  // o pacote leva exatamente os mesmos arquivos de interface que o instalador (e nenhum som)
  const prep = fs.readFileSync(path.join(__dirname, '..', 'desktop', 'scripts', 'prepare-app.js'), 'utf8');
  const lista = JSON.parse(prep.match(/const arquivos = (\[.*?\]);/)[1].replace(/'/g, '"'));
  const pk = upd.verificar(gerar(12, 1), pub);
  ok(lista.every(f => pk.files[f]) && Object.keys(pk.files).length === lista.length, 'pacote de atualização e instalador levam os mesmos arquivos de interface');
  ok(!Object.keys(pk.files).some(f => /^(audio|sf)\//.test(f)) && fs.statSync(path.join(tmp, 'pk12.json')).size < 2 * 1024 * 1024, 'pacote não leva sons e é pequeno');
  ok(lista.includes('update.js') && /update\.js/.test(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8')) && /update\.js/.test(fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')), 'update.js está no instalador, no index.html e no service worker');
  // o arquivo real de novidades do projeto precisa estar válido
  const real = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'desktop', 'novidades.json'), 'utf8'));
  ok(real.length && /^\d+\.\d+\.\d+$/.test(real[0].version) && /^\d{4}-\d\d-\d\d$/.test(real[0].date) && real[0].itens.length && real[0].itens.every(x => typeof x === 'string' && x.length > 10), 'desktop/novidades.json está válido (versão, data e itens)');
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(falhas ? '\natualizacao: ' + falhas + ' FALHA(S)' : '\natualizacao: tudo ok'); process.exit(falhas ? 1 : 0);
})();
