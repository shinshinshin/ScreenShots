const { dialog } = require('electron')
const fs = require('fs')

module.exports.convertUrl = (url) => {
  return url.replaceAll('\\', '_').replaceAll('/', '_').replaceAll(':', '_').replaceAll('*', '_').replaceAll('?', '_').replaceAll('"', '_').replaceAll('<', '_').replaceAll('>', '_').replaceAll('|', '_').replaceAll('.', '_')
}

module.exports.outputResultTxt = (results, filePath) => {
  const successUrls = results.filter((result) => result.success).map((result) => result.url).join('\n')
  const failUrls = results.filter((result) => !result.success).map((result) => result.url).join('\n')
  const fileText = '成功\n' + successUrls + '\n\n失敗\n' + failUrls
  fs.writeFileSync(filePath + '/result.txt', fileText)
}

module.exports.getSettingFile = () => {
  let settings
  try {
    settings = JSON.parse(fs.readFileSync('settings.json', 'utf-8'))
  } catch (e) {
    settings = {
      "screenWidth": 680,
      "screenHeight": 500,
      "urls": "",
      "fullPage": false,
      "imageWidth": 680,
      "outputPath": "results"
    }
  }
  return settings
}
module.exports.getFolder = async (mainWindow) => {
  const folderPath = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  }).then((result) => {
    if (result.canceled) return ''
    return result.filePaths[0]
  }).catch((err) => console.log(err))
  if (!folderPath) return ''
  return folderPath
}