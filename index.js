let urls
const screenShot = () => {
  const screenWidth = document.getElementById('screen_width').value
  const screenHeight = document.getElementById('screen_height').value
  urls = document.getElementById('urls').value.split('\n').filter(url => { return url.trim() !== '' })
  const fullPage = document.getElementById('full_page').checked
  window.electron.screenShot({ screenWidth, screenHeight, urls, fullPage })
  progress(0)
}

window.electron.completed((event, arg) => {
  alert('completed' + arg)
})
window.electron.stopped((event, arg) => {
  progress(arg.i + 1)
  alert(arg.url + 'でエラー')
})
window.electron.progress((event, arg) => {
  progress(arg)
})
const progress = (arg) => {
  const count = urls.length
  document.getElementById('progress').textContent = arg + '/' + count
}