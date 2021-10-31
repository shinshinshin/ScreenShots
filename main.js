const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path')
const puppeteer = require('puppeteer')
const moment = require('moment')
const makeDir = require('make-dir')
const sharp = require('sharp')
const fs = require('fs')

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
    const filePath = 'results/' + dirname
    await makeDir(filePath)
    const filePath2 = 'results2/' + dirname
    await makeDir(filePath2)
    const urls = arg.urls
    const screenWidth = Number(arg.screenWidth)
    const height = Number(arg.screenHeight)
    const fullPage = arg.fullPage
    const imageWidth = Number(arg.imageWidth)
    const results = []
    let url, i, browser, page, filename, fullFilename, fullFilename2
    for (i = 0; i < urls.length; i++) {
      try {
        browser = await puppeteer.launch({ headless: true })
        page = await browser.newPage()
        await page.setViewport({ width: screenWidth, height })
        url = urls[i]
        await page.goto(url, { waitUntil: 'networkidle0' })
        filename = url.replaceAll('\\', '_').replaceAll('/', '_').replaceAll(':', '_').replaceAll('*', '_').replaceAll('?', '_').replaceAll('"', '_').replaceAll('<', '_').replaceAll('>', '_').replaceAll('|', '_').replaceAll('.', '_')
        fullFilename = filePath + '/' + filename + '.png'
        fullFilename2 = filePath2 + '/' + filename + '.png'
        await page.screenshot({ path: fullFilename, fullPage })

        mainWindow.webContents.send('progress', i + 1)
        results.push({ index: i, url, success: true, file: fullFilename, file2: fullFilename2 })
      } catch (e) {
        mainWindow.webContents.send('stopped', { url, i })
        results.push({ index: i, url, success: false })
      } finally {
        browser.close()
      }
    }

    let result, image
    for (i = 0; i < results.length; i++) {
      try {
        result = results[i]
        if (result.success) {
          image = await sharp(result.file).resize(imageWidth)
          await image.toFile(result.file2)
        }
      } catch (e) {
        console.log(e)
      }
    }
    const fileText = results.map((result) => { return (result.success ? 'success:' : 'fail:') + result.url }).join('\n')
    fs.writeFileSync(filePath2 + '/result.txt', fileText)
    mainWindow.webContents.send('completed', results)
  })
});