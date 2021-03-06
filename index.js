const selectDir = async () => {
  const outputPath = document.getElementById('output_path')
  const dir = await electron.openDialog()
  if (!dir) outputPath.innerHTML = ''
  outputPath.innerHTML = dir
}

let urls
const screenShot = () => {
  const screenWidth = document.getElementById('screen_width').value || '680'
  const screenHeight = document.getElementById('screen_height').value || '500'
  urls = document.getElementById('urls').value.split('\n').filter(url => { return url.trim() !== '' })
  const fullPage = document.getElementById('full_page').checked
  const imageWidth = document.getElementById('image_width').value || '680'
  const outputPath = document.getElementById('output_path').value || 'results'
  window.electron.screenShot({ screenWidth, screenHeight, urls, fullPage, imageWidth, outputPath })
  progress(0)
  document.getElementById('exe_btn').disabled = true
}

window.electron.getSettings((event, arg) => {
  document.getElementById('screen_width').value = arg.screenWidth
  document.getElementById('screen_height').value = arg.screenHeight
  document.getElementById('full_page').checked = arg.fullPage
  document.getElementById('image_width').value = arg.imageWidth
  document.getElementById('output_path').innerHTML = arg.outputPath
  document.getElementById('urls').innerHTML = arg.urls.join('\n')
})
window.electron.completed((event, arg) => {
  //  alert('完了しました')
  document.getElementById('exe_btn').disabled = false
})
window.electron.stopped((event, arg) => {
  progress(arg.i + 1)
  //  alert(arg.url + 'でエラー')
})
window.electron.progress((event, arg) => {
  progress(arg)
})
const progress = (arg) => {
  const count = urls.length
  document.getElementById('progress').textContent = arg + '/' + count
}