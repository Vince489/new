const { app, BrowserWindow, BrowserView, protocol, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let browserView;

// DNS map for custom domains
const dnsMap = {
    'my-site.virts': path.join(__dirname, 'sites/my-site/index.html'),
    'example.huh': path.join(__dirname, 'sites/example/index.html'),
};

app.on('ready', () => {
    // Register the custom protocol
    protocol.registerStreamProtocol('virts', (request, callback) => {
        const url = request.url.replace('virts://', '');
        console.log(`Requested URL: ${url}`);

        const filePath = dnsMap[url];
        if (filePath) {
            callback({
                statusCode: 200,
                headers: { 'Content-Type': 'text/html' },
                data: fs.createReadStream(filePath),
            });
        } else {
            callback({
                statusCode: 404,
                headers: { 'Content-Type': 'text/plain' },
                data: fs.createReadStream(path.join(__dirname, '404.html')),
            });
        }
    });

    // Create the main window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        frame: true,
    });

    // Hide the default menu bar
    mainWindow.setMenuBarVisibility(false);

    // Create and attach a BrowserView
    browserView = new BrowserView();
    mainWindow.setBrowserView(browserView);

    // Set BrowserView bounds
    browserView.setBounds({ x: 0, y: 50, width: 1200, height: 750 });

    // Load initial URL
    browserView.webContents.loadURL('about:blank');

    // Add a toolbar interface
    mainWindow.loadFile(path.join(__dirname, 'toolbar.html'));

    // Handle navigation events from the toolbar
    const { ipcMain } = require('electron');

    ipcMain.on('navigate-back', () => {
        if (browserView.webContents.canGoBack()) browserView.webContents.goBack();
    });

    ipcMain.on('navigate-forward', () => {
        if (browserView.webContents.canGoForward()) browserView.webContents.goForward();
    });

    ipcMain.on('reload', () => {
        browserView.webContents.reload();
    });

    ipcMain.on('navigate-to', (event, url) => {
        const fullUrl = url.startsWith('http') || url.startsWith('virts://') ? url : `http://${url}`;
        browserView.webContents.loadURL(fullUrl);
    });

    // Add DevTools shortcut
    globalShortcut.register('Control+F12', () => {
        if (mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools();
        } else {
            mainWindow.webContents.openDevTools();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
