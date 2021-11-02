const fs = require('fs')
const makeDir = require('make-dir')
const sharp = require('sharp')
const puppeteer = require('puppeteer')
const { convertUrl } = require('./utils')
const fsExtra = require('fs-extra')

module.exports.getScreenShots = async (arg, mainWindow, filePath) => {
  const tmpPath = 'tmp/'
  await makeDir(tmpPath)
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
      let flgs = []
      await page.on('response', async res => {
        flgs.push(res.status() < 300 && res.status() >= 200)
      })
      await page.goto(url, { waitUntil: 'networkidle0' })
      console.log(flgs)
      const success = flgs.filter(flg => flg).length * 2 >= flgs.length
      if (success) {
        filename = convertUrl(url)
        tmpFilename = tmpPath + '/' + filename + '.png'
        fullFilename = filePath + '/' + filename + '.png'
        await page.screenshot({ path: tmpFilename, fullPage })

        mainWindow.webContents.send('progress', i + 1)
        results.push({ index: i, url, success: true, tmpFile: tmpFilename, outputFile: fullFilename })
      } else {
        mainWindow.webContents.send('stopped', { url, i })
        results.push({ index: i, url, success: false })
      }
    } catch (e) {
      console.log(e)
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
  const settings = JSON.stringify({ screenWidth, imageWidth, urls, fullPage, outputPath: arg.outputPath, screenHeight: height })
  fs.writeFileSync('settings.json', settings)
  fsExtra.remove(tmpPath)
  return results
}