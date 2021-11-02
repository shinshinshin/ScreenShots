const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path')
const moment = require('moment')
const { outputResultTxt, getSettingFile, getFolder } = require('./utils')
const { getScreenShots } = require('./getScreenShots')

let mainWindow = null;
app.on('ready', () => {
  // mainWindowを作成（windowの大きさや、Kioskモードにするかどうかなどもここで定義できる）
  mainWindow = new BrowserWindow({
    width: 450, height: 550, webPreferences: {
      nodeIntegration: false,
      preload: path.join(app.getAppPath(), 'preload.js'),
      contextIsolation: true
    }
  });
  mainWindow.setMenu(null)
  // Electronに表示するhtmlを絶対パスで指定（相対パスだと動かない）
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  // ChromiumのDevツールを開く
  //  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // 設定を送る
  mainWindow.webContents.on('did-finish-load', () => {
    const settings = getSettingFile()
    mainWindow.webContents.send('send-settings', settings)
  })

  // フォルダ選択ダイアログ
  ipcMain.handle('open-dialog', async () => {
    const folder = await getFolder()
    return folder
  })

  //　スクリーンショット撮影
  ipcMain.on('get_screen', async (event, arg) => {
    const dirname = moment().format('YYYY_MM_DD_HH_mm_ss')
    const filePath = arg.outputPath + '/' + dirname
    const results = await getScreenShots(arg, mainWindow, filePath)
    outputResultTxt(results, filePath)
    mainWindow.webContents.send('completed', results)
  })
})