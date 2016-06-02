'use strict';

if (require('electron-squirrel-startup')) return;

const electron = require('electron');
const {
	app,
	BrowserWindow,
	BrowserOptions,
	ipcMain,
	shell,
	dialog,
	Menu,
	MenuItem,
	autoUpdater
} = electron;

let electronScreen;
let mainWindow;
let ElectronSettings = require('electron-settings');
let settings = new ElectronSettings();
const os = require('os').platform();

let package_json = require('./package.json');

let WebApp = {
	callModeEnabled: false,
	confirmClose: true,
	allowSettingsSave: true,
	savedDimensions: {
		width: 0,
		height: 0,
		x: 0,
		y: 0
	}
}


// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  return;
}

function handleSquirrelEvent() {
  if (process.argv.length === 1) {
    return false;
  }

  const ChildProcess = require('child_process');
  const path = require('path');

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  const spawn = function(command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
    } catch (error) {}

    return spawnedProcess;
  };

  const spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      app.quit();
      return true;
  }
};

function createWindow() {
	electronScreen = require('electron').screen;
	
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
		title: 'SpeakUP',
		frame: false
	}

	if (winPosSaved) {
		var winPosLeft = settings.get('app.left');
		var winPosTop = settings.get('app.top');

		defaultSettings.width = winWidth;
		defaultSettings.height = winHeight;
		defaultSettings.x = winPosLeft;
		defaultSettings.y = winPosTop;
		defaultSettings.center = false;
		
		WebApp.savedDimensions.x = winPosLeft;
		WebApp.savedDimensions.y = winPosTop;
	} else {
		defaultSettings.width = winWidth;
		defaultSettings.height = winHeight;
		defaultSettings.center = true;
	}
	
	mainWindow = new BrowserWindow(defaultSettings);
	
	WebApp.savedDimensions.width = winWidth;
	WebApp.savedDimensions.height = winHeight;
	
	var pos = mainWindow.getPosition();
	WebApp.savedDimensions.x = pos[0];
	WebApp.savedDimensions.y = pos[1];
    // toaster.init(mainWindow);
	
	var menuTemplate = [{
        label: "Application",
        submenu: [
            {
				label: "DevTools [BrowserWindow]",
				accelerator: (function() {
					if (process.platform == 'darwin')
						return 'Alt+Command+J';
					else
						return 'Ctrl+Shift+J';
					})(),
				click: function() {
					console.log("Opening Browser Console");
					mainWindow.webContents.openDevTools();
				}
			},
            {
				label: "DevTools [WebView]",
				accelerator: (function() {
					if (process.platform == 'darwin')
						return 'Alt+Command+I';
					else
						return 'Ctrl+Shift+I';
					})(),
				click: function() {
					console.log("Opening WebView Console");
					mainWindow.webContents.send('open-devtools', {});
				}
			},
            {
				label: 'Reload',
				accelerator: 'CmdOrCtrl+R',
				click: function() {
					mainWindow.webContents.reload();
				}
			},
			{
				label: 'Report Issue',
				accelerator: 'CmdOrCtrl+H',
				click: function() {
					shell.openExternal('https://vk.com/speakupcf');
				}
			},
            {
				label: "Quit",
				accelerator: "CmdOrCtrl+Q",
				click: function() {
					app.quit();
				}
			}
        ]}, {
        label: "Edit",
        submenu: [
            { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
            { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
            { type: "separator" },
            { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
            { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
            { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
            { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
        ]}
    ];
	
	var mainMenu = Menu.buildFromTemplate(menuTemplate);
	
	mainWindow.setMenu(mainMenu);
	mainWindow.setMenuBarVisibility(false);
	mainWindow.setAutoHideMenuBar(true);

	mainWindow.on('close', function(e) {
		console.log("WebApp.confirmClose is now: ", WebApp.confirmClose);
		console.log("WebApp.callModeEnabled is now: ", WebApp.callModeEnabled);
		if (WebApp.callModeEnabled && WebApp.confirmClose) {
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
		if (WebApp.allowSettingsSave) {
			settings.set('app.maximized', true);
		}
	});

	mainWindow.on('unmaximize', function() {
		if (WebApp.allowSettingsSave) {
			settings.set('app.maximized', false);
		}
	});

	mainWindow.on('minimize', function(e) {
		console.log('Window has been minimized', 'callModeEnabled: ', WebApp.callModeEnabled);
	});

	mainWindow.on('restore', function() {
		console.log('Window has been restored', 'callModeEnabled: ', WebApp.callModeEnabled);
	});

	mainWindow.on('resize', function(e) {
		if (!this.isMaximized() && WebApp.allowSettingsSave) {
			var size = this.getSize();
			settings.set('app.width', size[0]);
			settings.set('app.height', size[1]);
			
			WebApp.savedDimensions.width = size[0];
			WebApp.savedDimensions.height = size[1];
		}
	});

	mainWindow.on('move', function(e) {
		if (!this.isMaximized() && WebApp.allowSettingsSave) {
			var pos = this.getPosition();
			settings.set('app.left', pos[0]);
			settings.set('app.top', pos[1]);
			
			WebApp.savedDimensions.x = pos[0];
			WebApp.savedDimensions.y = pos[1];
		}
	})

	if (winMaximized) {
		mainWindow.maximize();
	}

	mainWindow.loadURL('file://' + __dirname + '/check-connection.html');

	var webContents = mainWindow.webContents;

	webContents.on('did-fail-load', function(e) {
		console.log('load error');
	});
	
	if (os === 'win32') {
		//var updateFeed = 'https://speakup.cf/update.php';
		var updateFeed = 'https://speakup.cf/client/squirrel';
		autoUpdater.setFeedURL(updateFeed + '?v=' + package_json.version + '&os=' + os);
		
		autoUpdater
			.on('error', function(){
				if (!(arguments && arguments[1] && arguments[1] == 'Can not find Squirrel')) {
					console.log("Checking updates error", arguments);
				}
			})
			.on('checking-for-update', function() {
				console.log('Checking for update');
			})
			.on('update-available', function() {
				console.log('Update available');
			})
			.on('update-not-available', function() {
				console.log('Update not available');
			})
			.on('update-downloaded', function() {
				console.log('Update downloaded');
				var choice = dialog.showMessageBox(
					mainWindow,
					{
						type: 'question',
						buttons: ['Yes', 'No'],
						defaultId: 0,
						title: 'Auto Update',
						message: "New version of SpeakUP is available.\nDo you want to install the update?"
					}
				);

				if (choice === 0) {
					autoUpdater.quitAndInstall();
				}
			});
			
		autoUpdater.checkForUpdates();
		setInterval(function() {
			autoUpdater.checkForUpdates();
		}, 30 * 60000);
	}
}

app.setAppUserModelId("com.club.confy");

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
		var room = '';
		for (var i = 0; i < process.argv.length; i++) {
			if (process.argv[i].indexOf('speakup://') != -1) {
				room = process.argv[i].replace('speakup://', '');
				break;
			}
		}
		//mainWindow.loadURL('https://speakup.cf/' + room, BrowserOptions);
		mainWindow.loadURL('file://' + __dirname + '/frame.html?room=' + room, BrowserOptions);
	} else {
		mainWindow.loadURL('file://' + __dirname + '/no-connection.html');
	}
});

ipcMain.on('call-mode-change', function(event, status) {
	console.log('WebApp.callModeEnabled changed to: ', status);
	if (status == 'enable') {
		WebApp.callModeEnabled = true;
		mainWindow.webContents.send('call-mode-change-notify', {enabled: true});
	} else {
		WebApp.callModeEnabled = false;
		MinimizationController.miniMode.deactivate();
		mainWindow.webContents.send('call-mode-change-notify', {enabled: false});
	}
});

ipcMain.on('confirm-close-change', function(event, status) {
	console.log('WebApp.confirmClose changed to: ', status);
	if (status == 'enable') {
		WebApp.confirmClose = true;
	} else {
		WebApp.confirmClose = false;
	}
});

let MinimizationController = {
	miniMode: {
		isActive: false,
		
		activate: function() {
			var newSize = {
				w: 340,
				h: 220
			}
			
			WebApp.allowSettingsSave = false;
			mainWindow.setMinimizable(false);
			mainWindow.setMaximizable(false);
			mainWindow.setClosable(false);
			mainWindow.setResizable(false);
			mainWindow.setAlwaysOnTop(true);
			
			var winSize = mainWindow.getSize();
			var winPos = mainWindow.getPosition();
			WebApp.savedDimensions.width = winSize[0];
			WebApp.savedDimensions.height = winSize[1];
			WebApp.savedDimensions.x = winPos[0];
			WebApp.savedDimensions.y = winPos[1];
			mainWindow.setMinimumSize(newSize.w, newSize.h);
			mainWindow.setSize(newSize.w, newSize.h);
			
			var screenArea = electronScreen.getPrimaryDisplay().workArea;
			console.log(screenArea.width);
			mainWindow.setPosition(
				screenArea.width - screenArea.x - newSize.w,
				screenArea.height - screenArea.y - newSize.h
			);
			
			mainWindow.webContents.send('titlebar-change-notify', {show: true});
			this.isActive = true;
		},
		
		deactivate: function() {
			WebApp.allowSettingsSave = true;
			mainWindow.setMinimizable(true);
			mainWindow.setMaximizable(true);
			mainWindow.setClosable(true);
			mainWindow.setResizable(true);
			mainWindow.setAlwaysOnTop(false);
			mainWindow.setMinimumSize(640, 360);
			mainWindow.setSize(
				WebApp.savedDimensions.width,
				WebApp.savedDimensions.height
			);
			
			mainWindow.setPosition(
				WebApp.savedDimensions.x,
				WebApp.savedDimensions.y
			);
			
			mainWindow.webContents.send('titlebar-change-notify', {show: false});
			this.isActive = false;
		}
	},
	
	fullMode: {
		activate: function() {
			mainWindow.restore();
		},
		
		deactivate: function() {
			mainWindow.minimize();
		}
	}
}

ipcMain.on('titlebar-minimize', function(event) {
	console.log('** Triggered titlebar-minimize');
	console.log('> callModeEnabled: ', WebApp.callModeEnabled);
	console.log('> miniModeIsActive: ', MinimizationController.miniMode.isActive);
	
	if (WebApp.callModeEnabled) {
		if (MinimizationController.miniMode.isActive) {
			MinimizationController.miniMode.deactivate();
		} else {
			MinimizationController.miniMode.activate();
		}
	} else {
		MinimizationController.miniMode.deactivate();
		mainWindow.minimize();
	}
});
