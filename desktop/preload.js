const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pulseDesktop', {
  getState: () => ipcRenderer.invoke('get-state'),
  onState: (handler) => {
    const listener = (_event, state) => handler(state)
    ipcRenderer.on('pulse-timer-state', listener)
    return () => ipcRenderer.removeListener('pulse-timer-state', listener)
  },
  close: () => ipcRenderer.send('close-timer'),
})
