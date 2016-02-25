'use strict';

const electron = require('electron');
const ipcMain = electron.ipcMain;
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const BrowserOptions = {'extraHeaders' : 'pragma: no-cache\n'};
const shell = require('electron').shell;
const dialog = require('electron').dialog;

let mainWindow;
let ElectronSettings = require('electron-settings');
let settings = new ElectronSettings();
let callModeEnabled = false;

let Toaster = require('electron-toaster');
let toaster = new Toaster();

let Menu = require('menu');
let MenuItem = require('menu-item');

function createWindow() {
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
		width: 1024,
		height: 600,
		center: true,
		icon: __dirname + '/images/favicon-32x32.png',
		title: 'SpeakUP'
	}

	if (winPosSaved) {
		var winPosLeft = settings.get('app.left');
		var winPosTop = settings.get('app.top');

		defaultSettings.width = winWidth;
		defaultSettings.height = winHeight;
		defaultSettings.x = winPosLeft;
		defaultSettings.y = winPosTop;
		defaultSettings.center = false;
	} else {
		defaultSettings.width = winWidth;
		defaultSettings.height = winHeight;
		defaultSettings.center = true;
	}

	mainWindow = new BrowserWindow(defaultSettings);
    toaster.init(mainWindow);

	// mainWindow.setMenuBarVisibility(false);
	var mainMenu = new Menu();
	var mainSubMenu = new Menu();
	
	mainMenu.append(
		new MenuItem({
			label: 'SpeakUP',
			type: 'submenu',
			submenu: mainSubMenu
		})
	);
	
	mainSubMenu.append(
		new MenuItem({
			label: 'DevTools',
			accelerator: (function() {
				if (process.platform == 'darwin')
					return 'Alt+Command+I';
				else
					return 'Ctrl+Shift+I';
				})(),
			click: function() {
				mainWindow.webContents.openDevTools();
			}
		})
	);
	
	mainSubMenu.append(
		new MenuItem({
			label: 'Reload',
			accelerator: 'CmdOrCtrl+R',
			click: function() {
				mainWindow.webContents.reload();
			}
		})
	);
	
	mainSubMenu.append(
		new MenuItem({
			label: 'Report Issue',
			accelerator: 'CmdOrCtrl+H',
			click: function() {
				shell.openExternal('https://vk.com/speakupcf');
			}
		})
	);
	
	mainWindow.setMenu(mainMenu);

	mainWindow.on('close', function(e) {
		if (callModeEnabled) {
			var choice = dialog.showMessageBox(
				mainWindow,
				{
					type: 'question',
					buttons: ['Yes', 'No'],
					defaultId: 0,
					title: 'Confirm',
					message: "You are currently in conference.\nDo you really want to close SpeakUP?"
				}
			);

			if (choice !== 0) {
				e.preventDefault();
			}
		}
	});
	
	mainWindow.on('closed', function() {
		mainWindow = null;
	});

	mainWindow.on('maximize', function() {
		settings.set('app.maximized', true);
	});

	mainWindow.on('unmaximize', function() {
		settings.set('app.maximized', false);
	});

	mainWindow.on('minimize', function() {
		console.log('Window has been minimized', 'callModeEnabled: ', callModeEnabled);
	});

	mainWindow.on('restore', function() {
		console.log('Window has been restored', 'callModeEnabled: ', callModeEnabled);
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

	mainWindow.loadURL('file://' + __dirname + '/check-connection.html');

	var webContents = mainWindow.webContents;

	webContents.on('did-fail-load', function(e) {
		console.log('load error', e);
	});
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
		
		var notification = new Notification('Notification title', {
			body: "Hey there! You've been notified!",
        });
	}
});

ipcMain.on('online-status-changed', function(event, status) {
	if (status == 'online') {
		var room = '';
		for (var i = 0; i < process.argv.length; i++) {
			if (process.argv[i].indexOf('speakup://') != -1) {
				room = '/c/' + process.argv[i].replace('speakup://', '');
				break;
			}
		}
		mainWindow.loadURL('https://speakup.cf/' + room, BrowserOptions);
	} else {
		mainWindow.loadURL('file://' + __dirname + '/no-connection.html');
	}
});

ipcMain.on('call-mode-change', function(event, status) {
	console.log('Call mode changed to: ', status);
	if (status == 'enabled') {
		callModeEnabled = true;
	} else {
		callModeEnabled = false;
	}
});
