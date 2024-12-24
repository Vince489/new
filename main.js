const { app, BrowserWindow, protocol, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// DNS map for custom domains
const dnsMap = {
    'my-site.virts': path.join(__dirname, 'sites/my-site/index.html'),
    'example.huh': path.join(__dirname, 'sites/example/index.html'),
};

app.on('ready', () => {
    // Register the custom protocol using streams
    protocol.registerStreamProtocol('virts', (request, callback) => {
        const url = request.url.replace('virts://', ''); // Remove protocol prefix
        console.log(`Requested URL: ${url}`);

        const filePath = dnsMap[url];
        if (filePath) {
            console.log(`Resolved file path: ${filePath}`);
            // Stream the file to the response
            callback({
                statusCode: 200,
                headers: { 'Content-Type': 'text/html' },
                data: fs.createReadStream(filePath),
            });
        } else {
            console.error(`Domain not found in DNS map: ${url}`);
            callback({
                statusCode: 404,
                headers: { 'Content-Type': 'text/plain' },
                data: fs.createReadStream(path.join(__dirname, '404.html')), // Optional: Serve an error page
            });
        }
    });

    // Get the current screen's dimensions
    const { width, height } = require('electron').screen.getPrimaryDisplay().workAreaSize;

    // Create the main browser window
    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        webPreferences: {
            nodeIntegration: true, // Enable Node.js integration
            contextIsolation: false, // Disable context isolation
            webviewTag: true, // Enable webview support
        },
        frame: true, // Enable frame for custom title bar
    });

    // Hide the default menu bar
    mainWindow.setMenuBarVisibility(false);

    // Load the main UI
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Add a right-click context menu for opening DevTools
    mainWindow.webContents.on('context-menu', (event, params) => {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Open DevTools',
                click: () => {
                    mainWindow.webContents.openDevTools({ mode: 'detach' }); // Open in a detached window
                },
            },
        ]);
        contextMenu.popup();
    });

    // Register a global shortcut for Ctrl+F12 to toggle DevTools
    const isShortcutRegistered = globalShortcut.register('Control+F12', () => {
        if (mainWindow) {
            if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools(); // Close if already open
            } else {
                mainWindow.webContents.openDevTools(); // Open if closed
            }
        }
    });

    // Log if the shortcut registration was successful
    console.log(`Shortcut Ctrl+F12 registered: ${isShortcutRegistered}`);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    // Unregister all shortcuts when the app quits
    globalShortcut.unregisterAll();
});
