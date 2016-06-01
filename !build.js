var electronInstaller = require('electron-winstaller');

resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: 'D:\\Recycle Bin\\Share\\SpeakUP-Client-Windows',
    outputDirectory: 'D:\\Recycle Bin\\Share\\SpeakUP-Client-Releases\\',
    authors: 'LinkSoft',
    description: 'SpeakUP',
    exe: 'SpeakUP.exe',
	noMsi: true,
	loadingGif: 'images/installing.gif',
	setupExe: 'SpeakUP_Setup.exe',
	setupIcon: 'images/taskbar.ico'
});

resultPromise.then(() => console.log("It worked!"), (e) => console.log(`No dice: ${e.message}`));