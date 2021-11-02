const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
  'electron',
  {
    completed: (arg) => { ipcRenderer.on('completed', arg) },
    progress: (arg) => { ipcRenderer.on('progress', arg) },
    stopped: (arg) => { ipcRenderer.on('stopped', arg) },
    getSettings: (arg) => { ipcRenderer.on('send-settings', arg) },
    screenShot: (arg) => ipcRenderer.send('get_screen', arg),
    openDialog: async () => await ipcRenderer.invoke('open-dialog'),
  }
)