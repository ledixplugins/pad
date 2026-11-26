// AURA Pad — app para Windows e macOS. © 2026 Thiago R. Galvão. Todos os direitos reservados. ID: AURA-PD-TRG-2026
// Mesma casca do AURA Synth Bass: abre a interface web embutida (com todos os sons, funciona offline) pelo protocolo aura://
const { app, BrowserWindow, Menu, protocol, net, session, shell, ipcMain, dialog, powerSaveBlocker } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto'), { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

protocol.registerSchemesAsPrivileged([{ scheme: 'aura', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);
if (!app.requestSingleInstanceLock()) app.quit();

// ---- identificação do aparelho (hash de um ID estável do sistema; nunca enviamos o ID bruto)
function rawMachineId() {
  try {
    if (process.platform === 'win32') {
      const o = execFileSync('reg', ['query', 'HKLM\\SOFTWARE\\Microsoft\\Cryptography', '/v', 'MachineGuid'], { encoding: 'utf8', windowsHide: true });
      const m = o.match(/MachineGuid\s+REG_SZ\s+(\S+)/i); if (m) return m[1];
    } else if (process.platform === 'darwin') {
      const o = execFileSync('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice'], { encoding: 'utf8' });
      const m = o.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/); if (m) return m[1];
    } else { return fs.readFileSync('/etc/machine-id', 'utf8').trim(); }
  } catch (e) { console.warn('id do aparelho', e.message); }
  return os.hostname() + '|' + os.userInfo().username;
}
const DEVICE_ID = crypto.createHash('sha256').update('AURA-PD-TRG-2026|' + rawMachineId()).digest('hex').slice(0, 32);

// ---- estado da licença guardado em dois lugares (reinstalar não reinicia o teste)
const f1 = () => path.join(app.getPath('userData'), 'lic.json');
const f2 = () => path.join(os.homedir(), process.platform === 'win32' ? 'AppData/Local/AuraPD/.lic' : '.config/.aura-pd-lic');
function readJ(f) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } }
function writeJ(f, j) { try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(j)); } catch (e) { console.warn('gravar licença', e.message); } }
function mergeLic(a, b) {
  if (!a) return b; if (!b) return a;
  const r = Object.assign({}, a, b.val > (a.val || 0) ? b : {});
  r.t0 = Math.min(a.t0 || Infinity, b.t0 || Infinity); if (!isFinite(r.t0)) r.t0 = 0; r.seen = Math.max(a.seen || 0, b.seen || 0); return r;
}
ipcMain.on('aura:sync', e => { e.returnValue = { deviceId: DEVICE_ID, deviceName: os.hostname().slice(0, 24), version: app.getVersion(), platform: process.platform }; });
ipcMain.handle('aura:store:get', () => { const m = mergeLic(readJ(f1()), readJ(f2())); return m ? JSON.stringify(m) : null; });
ipcMain.handle('aura:store:set', (e, k, v) => { let j; try { j = JSON.parse(v); } catch (x) { return false; } writeJ(f1(), j); writeJ(f2(), j); return true; });
ipcMain.handle('aura:open', (e, u) => { if (/^https:\/\/(ledixplugins\.com\.br|[a-z0-9.-]+\.lemonsqueezy\.com)\//.test(u)) shell.openExternal(u); });
ipcMain.handle('aura:http', async (e, url, body) => {          // pedidos ao servidor de licenças feitos pelo processo principal (sem CORS)
  if (!/^https:\/\/(api\.lemonsqueezy\.com|aura-trial\.ledixplugins\.workers\.dev)\//.test(url)) return { error: 'URL inválida', _http: 0 };
  try {
    const r = await net.fetch(url, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() });
    let j = {}; try { j = await r.json(); } catch (x) { j = {}; } j._http = r.status; return j;
  } catch (x) { throw new Error('offline'); }
});

// interface e sons: dentro do instalador (fora do asar, para ler os áudios direto do disco)
const webRoot = () => app.isPackaged ? path.join(process.resourcesPath, 'web') : path.join(__dirname, '..', 'app');

function createWindow() {
  const win = new BrowserWindow({ width: 1280, height: 800, minWidth: 900, minHeight: 560, backgroundColor: '#0b0a09', title: 'AURA Pad',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, autoplayPolicy: 'no-user-gesture-required' } });
  win.loadURL('aura://app/index.html');
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\/ledixplugins\.com\.br\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('aura://')) e.preventDefault(); });
}
app.whenReady().then(() => {
  const root = webRoot();
  protocol.handle('aura', req => {
    const p = decodeURIComponent(new URL(req.url).pathname);
    const f = path.normalize(path.join(root, p));
    if (!f.startsWith(root)) return new Response('', { status: 403 });
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return net.fetch(pathToFileURL(f).toString());
    return new Response('', { status: 404 });
  });
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['midi', 'midiSysex', 'fullscreen', 'wakeLock', 'screen-wake-lock'].includes(perm)));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => ['midi', 'midiSysex', 'fullscreen', 'wakeLock', 'screen-wake-lock'].includes(perm));
  powerSaveBlocker.start('prevent-display-sleep');      // a tela não apaga no meio do culto
  const about = () => dialog.showMessageBox({ type: 'info', title: 'Sobre o AURA Pad', message: 'AURA Pad ' + app.getVersion(), detail: 'Criado por Thiago R. Galvão\n© 2026 · Todos os direitos reservados\nID: AURA-PD-TRG-2026\n\nhttps://ledixplugins.com.br/aurapad/' });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: 'AURA Pad', submenu: [{ label: 'Sobre o AURA Pad', click: about }, { type: 'separator' }, { role: 'hide', label: 'Ocultar' }, { role: 'hideOthers', label: 'Ocultar outros' }, { type: 'separator' }, { role: 'quit', label: 'Sair' }] }] : []),
    { label: 'Exibir', submenu: [{ role: 'togglefullscreen', label: 'Tela cheia' }, { role: 'reload', label: 'Recarregar' }, { role: 'zoomIn', label: 'Aumentar' }, { role: 'zoomOut', label: 'Diminuir' }, { role: 'resetZoom', label: 'Tamanho normal' }] },
    { label: 'Ajuda', submenu: [{ label: 'Site do AURA Pad', click: () => shell.openExternal('https://ledixplugins.com.br/aurapad/') }, ...(process.platform !== 'darwin' ? [{ label: 'Sobre', click: about }] : [])] }]));
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
