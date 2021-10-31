const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path')
const moment = require('moment')
const makeDir = require('make-dir')
const sharp = require('sharp')
const fs = require('fs')
const fsExtra = require('fs-extra')
const puppeteer = require('puppeteer')

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
    const tmpPath = 'tmp/'
    await makeDir(tmpPath)
    const filePath = 'results/' + dirname
    await makeDir(filePath)
    const urls = arg.urls
    const screenWidth = Number(arg.screenWidth)
    const height = Number(arg.screenHeight)
    const fullPage = arg.fullPage
    const imageWidth = Number(arg.imageWidth)
    const results = []
    let url, i, browser, page, filename, tmpFilename, fullFilename
    function getChromiumExecPath() {
      return puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked');
    }
    for (i = 0; i < urls.length; i++) {
      try {
        browser = await puppeteer.launch({ headless: true, executablePath: getChromiumExecPath() })
        page = await browser.newPage()
        await page.setViewport({ width: screenWidth, height })
        url = urls[i]
        await page.goto(url, { waitUntil: 'networkidle0' })
        filename = url.replaceAll('\\', '_').replaceAll('/', '_').replaceAll(':', '_').replaceAll('*', '_').replaceAll('?', '_').replaceAll('"', '_').replaceAll('<', '_').replaceAll('>', '_').replaceAll('|', '_').replaceAll('.', '_')
        tmpFilename = tmpPath + '/' + filename + '.png'
        fullFilename = filePath + '/' + filename + '.png'
        await page.screenshot({ path: tmpFilename, fullPage })

        mainWindow.webContents.send('progress', i + 1)
        results.push({ index: i, url, success: true, tmpFile: tmpFilename, outputFile: fullFilename })
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
          image = await sharp(result.tmpFile).resize(imageWidth)
          await image.toFile(result.outputFile)
        }
      } catch (e) {
        console.log(e)
      }
    }
    const fileText = results.map((result) => { return (result.success ? 'success:' : 'fail:') + result.url }).join('\n')
    fs.writeFileSync(filePath + '/result.txt', fileText)
    fsExtra.remove(tmpPath)
    mainWindow.webContents.send('completed', results)
  })
});