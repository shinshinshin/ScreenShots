const screenShot = () => {
  window.electron.screenShot({ screenWidth: document.getElementById('screen_width').value, urls: document.getElementById('urls').value })
}

window.electron.completed((event, arg) => {
  alert('completed' + arg)
})