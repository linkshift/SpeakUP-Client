@echo off
SET RELDIR="D:\Recycle Bin\Share\SpeakUP-Client-Windows"
SET RCEDIT="D:\Cloud\Portable Apps\rcedit\rcedit.exe"

del /F /S /Q %RELDIR%\resources\default_app
del /F /S /Q %RELDIR%\resources\default_app.asar
del /F /S /Q %RELDIR%\resources\app
del /F /S /Q %RELDIR%\resources\app.asar
md %RELDIR%\resources\app

xcopy /E /I /Y images %RELDIR%\resources\app\images\
xcopy /E /I /Y node_modules %RELDIR%\resources\app\node_modules\
xcopy /E /I /Y check-connection.html %RELDIR%\resources\app\
xcopy /E /I /Y main.js %RELDIR%\resources\app\
xcopy /E /I /Y no-connection.html %RELDIR%\resources\app\
xcopy /E /I /Y frame.html %RELDIR%\resources\app\
xcopy /E /I /Y package.json %RELDIR%\resources\app\

IF NOT EXIST %RELDIR%\electron.exe (
	echo Renaming SpeakUP.exe to electron.exe
	IF EXIST %RELDIR%\SpeakUP.exe rename %RELDIR%\SpeakUP.exe electron.exe
) ELSE (
	del /F /S /Q %RELDIR%\SpeakUP.exe
)

echo Editing app metadata
%RCEDIT% %RELDIR%\electron.exe --set-icon %RELDIR%\resources\app\images\taskbar.ico --set-version-string "Comments" "SpeakUP Client" --set-version-string "FileDescription" "SpeakUP Client" --set-version-string "CompanyName" "SpeakUP" --set-version-string "LegalCopyright" "Copyright (c) LinkSoft 2016" --set-version-string "ProductName" "SpeakUP Client" --set-version-string "OriginalFilename" "SpeakUP.exe" --set-version-string "InternalName" "SpeakUP"

echo Deleting electron-prebuilt
del /F /S /Q %RELDIR%\resources\app\node_modules\electron-prebuilt

echo Packing app.asar
cmd /C asar pack %RELDIR%\resources\app %RELDIR%\resources\app.asar
del /F /S /Q %RELDIR%\resources\app

rename %RELDIR%\electron.exe SpeakUP.exe

echo Building Installer
node !build.js

echo Finished
pause