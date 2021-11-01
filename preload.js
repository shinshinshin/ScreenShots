const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
  'electron',
  {
    screenShot: (arg) => ipcRenderer.send('get_screen', arg),
    completed: (arg) => { ipcRenderer.on('completed', arg) },
    progress: (arg) => { ipcRenderer.on('progress', arg) },
    stopped: (arg) => { ipcRenderer.on('stopped', arg) },
    openDialog: async () => await ipcRenderer.invoke('open-dialog')
  }
)