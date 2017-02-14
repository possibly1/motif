const electron = require('electron');
const autoUpdater = require("electron-updater").autoUpdater;
const Menu = electron.Menu;
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
const path = require('path')
const url = require('url')
const ipcMain = electron.ipcMain;

const isDev = process.env.IS_DEV === "true";

app.setName('Motif');
// See: http://stackoverflow.com/questions/36123964/how-to-set-up-application-menu-in-electron
// for this to show up.

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function notify(title, message) {
  let windows = BrowserWindowElectron.getAllWindows()
  if (windows.length == 0) {
    return
  }

  windows[0].webContents.send("notify", title, message)
}

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  if(isDev) {
    // Open the DevTools.
    mainWindow.webContents.openDevTools();
  } else {
    const log = require("electron-log")
    log.transports.file.level = "info"
    autoUpdater.logger = log

    autoUpdater.on('updateAvailable', () => {
      notify('no dash', arguments);
    });

    autoUpdater.on('update-available', () => {
      notify('dash', arguments);
    });

    autoUpdater.signals.updateDownloaded(it => {
      notify("A new update is ready to install", `Version ${it.version} is downloaded and will be automatically installed on Quit`)
    });
    autoUpdater.checkForUpdates();
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

if (isDev) {
  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.
  require('electron-reload')(__dirname);
}
