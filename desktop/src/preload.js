// Ponte segura entre o app e o sistema. © 2026 Thiago R. Galvão.
const { contextBridge, ipcRenderer } = require('electron');
const info = ipcRenderer.sendSync('aura:sync');
contextBridge.exposeInMainWorld('auraDesktop', {
  deviceId: info.deviceId, deviceName: info.deviceName, version: info.version, platform: info.platform,
  store: { get: () => ipcRenderer.invoke('aura:store:get'), set: (k, v) => ipcRenderer.invoke('aura:store:set', k, v) },
  http: (url, body) => ipcRenderer.invoke('aura:http', url, body),
  openExternal: u => ipcRenderer.invoke('aura:open', u),
  config: {},
  update: {
    ready: () => ipcRenderer.invoke('aura:update:ready'),                 // avisa que a interface abriu bem; devolve {build, version, status}
    apply: () => ipcRenderer.invoke('aura:update:apply'),                 // só quando o usuário clica em Atualizar
    onStatus: cb => ipcRenderer.on('aura:update:status', (e, r) => cb(r))
  }
});
