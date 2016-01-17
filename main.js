'use strict';

const electron = require('electron');
const ipcMain = electron.ipcMain;
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const BrowserOptions = {"extraHeaders" : "pragma: no-cache\n"}

let mainWindow;
let ElectronSettings = require('electron-settings');
let settings = new ElectronSettings();

function createWindow () {
	var winWidth = typeof settings.get('app.width') == 'undefined' ?
		1024 : settings.get('app.width');

	var winHeight = typeof settings.get('app.height') == 'undefined' ?
		600 : settings.get('app.height');

	var winMaximized = typeof settings.get('app.maximized') == 'undefined' ?
		false : settings.get('app.maximized');

	var winPosSaved = !(typeof settings.get('app.left') == 'undefined' ||
		typeof settings.get('app.top') == 'undefined');

	var defaultSettings = {
		minWidth: 640,
		minHeight: 360,
		windowWidth: 1024,
		windowHeight: 600,
		center: true,
		icon: __dirname + "/images/favicon.png",
		title: "SpeakUP"
	}

	if (winPosSaved) {
		var winPosLeft = settings.get('app.left');
		var winPosTop = settings.get('app.top');

		defaultSettings.windowWidth = winWidth;
		defaultSettings.windowHeight = winHeight;
		defaultSettings.x = winPosLeft;
		defaultSettings.y = winPosTop;
		defaultSettings.center = false;
	} else {
		defaultSettings.windowWidth = winWidth;
		defaultSettings.windowHeight = winHeight;
		defaultSettings.center = true;
	}

	mainWindow = new BrowserWindow(defaultSettings);

	mainWindow.setMenu(null);

	mainWindow.on('closed', function() {
		mainWindow = null;
	});

	mainWindow.on('maximize', function() {
		settings.set('app.maximized', true);
	});

	mainWindow.on('unmaximize', function() {
		settings.set('app.maximized', false);
	});

	mainWindow.on('resize', function(e) {
		if (!this.isMaximized()) {
			var size = this.getSize();
			settings.set('app.width', size[0]);
			settings.set('app.height', size[1]);
		}
	});

	mainWindow.on('move', function(e) {
		if (!this.isMaximized()) {
			var pos = this.getPosition();
			settings.set('app.left', pos[0]);
			settings.set('app.top', pos[1]);
		}
	})

	if (winMaximized) {
		mainWindow.maximize();
	}

	mainWindow.loadURL("file://" + __dirname + "/check-connection.html");
	// mainWindow.webContents.openDevTools();

	var webContents = mainWindow.webContents;
}

app.on('ready', createWindow);
app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', function () {
	if (mainWindow === null) {
		createWindow();
	}
});

ipcMain.on('online-status-changed', function(event, status) {
	if (status == 'online') {
		mainWindow.loadURL("https://speakup.cf/", BrowserOptions);
	} else {
		mainWindow.loadURL("file://" + __dirname + "/no-connection.html");
	}
});
