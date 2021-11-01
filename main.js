const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  ipcMain.handle('open-dialog', async () => {
    const dirpath = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    }).then((result) => {
      if (result.canceled) return
      return result.filePaths[0]
    }).catch((err) => console.log(err))
    if (!dirpath) return ''
    return dirpath
  })

  ipcMain.on('get_screen', async (event, arg) => {
    const dirname = moment().format('YYYY_MM_DD_HH_mm_ss')
    const tmpPath = 'tmp/'
    await makeDir(tmpPath)
    const filePath = arg.outputPath + '/' + dirname
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

    const successUrls = results.filter((result) => result.success).map((result) => result.url).join('\n')
    const failUrls = results.filter((result) => !result.success).map((result) => result.url).join('\n')
    const fileText = '成功\n' + successUrls + '\n\n失敗\n' + failUrls
    fs.writeFileSync(filePath + '/result.txt', fileText)
    fsExtra.remove(tmpPath)
    mainWindow.webContents.send('completed', results)
  })
});