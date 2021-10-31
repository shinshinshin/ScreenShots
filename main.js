const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path')
const puppeteer = require('puppeteer')
const moment = require('moment')
const makeDir = require('make-dir')

let mainWindow = null;
app.on('ready', () => {
  // mainWindowを作成（windowの大きさや、Kioskモードにするかどうかなどもここで定義できる）
  mainWindow = new BrowserWindow({
    width: 450, height: 400, webPreferences: {
      nodeIntegration: false,
      preload: path.join(app.getAppPath(), 'preload.js'),
      contextIsolation: true
    }
  });
  mainWindow.setMenu(null)
  // Electronに表示するhtmlを絶対パスで指定（相対パスだと動かない）
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  // ChromiumのDevツールを開く
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  ipcMain.on('get_screen', async (event, arg) => {
    const dirname = moment().format('YYYY_MM_DD_HH_mm_ss')
    const urls = arg.urls.split('\n')
    await urls.forEach(async url => {
      try {
        const browser = await puppeteer.launch({ headless: true })
        const page = await browser.newPage()
        const width = Number.isFinite(arg.width) ? Number(arg.width) : 680
        await page.setViewport({ width, height: 500 })
        await page.goto(url, { waitUntil: 'networkidle0' })
        const filename = url.replaceAll('\\', '￥').replaceAll('/', '／').replaceAll(':', '：').replaceAll('*', '＊').replaceAll('?', '？').replaceAll('"', '”').replaceAll('<', '＜').replaceAll('>', '＞').replaceAll('|', '｜')
        await makeDir('results/' + dirname)
        await page.screenshot({ path: 'results/' + dirname + '/' + filename + '.png', fullPage: true })
      } catch (e) {
        throw (e)
      } finally {
        browser.close()
      }
    });
    mainWindow.webContents.send('completed', arg.screenWidth)
  })
});