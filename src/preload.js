const {contextBridge, ipcRenderer} = require('electron');
contextBridge.exposeInMainWorld('luma', {
  settings: () => ipcRenderer.invoke('settings'),
  setClientId: id => ipcRenderer.invoke('set-client-id', id),
  connect: () => ipcRenderer.invoke('connect'),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  playback: () => ipcRenderer.invoke('playback'),
  control: command => ipcRenderer.invoke('control', command),
  lookupLyrics: track => ipcRenderer.invoke('lookup-lyrics', track),
  preferences: value => ipcRenderer.invoke('preferences', value),
  importLyrics: () => ipcRenderer.invoke('import-lyrics'),
  sampleLyrics: () => ipcRenderer.invoke('sample-lyrics'),
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  onAuth: fn => ipcRenderer.on('auth-state', (_event, state) => fn(state))
});
