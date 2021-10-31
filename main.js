const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path')
const puppeteer = require('puppeteer')
const moment = require('moment')
const makeDir = require('make-dir')

let mainWindow = null;
app.on('ready', () => {
  // mainWindowを作成（windowの大きさや、Kioskモードにするかどうかなどもここで定義できる）
  mainWindow = new BrowserWindow({
    width: 450, height: 500, webPreferences: {
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
    await makeDir('results/' + dirname)
    const urls = arg.urls
    const width = Number.isFinite(arg.width) ? Number(arg.width) : 680
    const height = Number.isFinite(arg.height) ? Number(arg.height) : 500
    const fullPage = arg.fullPage
    let url, i, browser, page, filename
    for (i = 0; i < urls.length; i++) {
      try {
        browser = await puppeteer.launch({ headless: true })
        page = await browser.newPage()
        await page.setViewport({ width, height })
        url = urls[i]
        await page.goto(url, { waitUntil: 'networkidle0' })
        filename = url.replaceAll('\\', '￥').replaceAll('/', '／').replaceAll(':', '：').replaceAll('*', '＊').replaceAll('?', '？').replaceAll('"', '”').replaceAll('<', '＜').replaceAll('>', '＞').replaceAll('|', '｜')
        await page.screenshot({ path: 'results/' + dirname + '/' + filename + '.png', fullPage })
        mainWindow.webContents.send('progress', i + 1)
      } catch (e) {
        mainWindow.webContents.send('stopped', { url, i })
      } finally {
        browser.close()
      }
    }
    mainWindow.webContents.send('completed', arg.screenWidth)
  })
});