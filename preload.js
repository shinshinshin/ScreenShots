const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld(
  'electron',
  {
    screenShot: (arg) => ipcRenderer.send('get_screen', arg),
    completed: (arg) => { ipcRenderer.on('completed', arg) }
  }
)