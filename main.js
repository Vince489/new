const { app, BrowserWindow, BrowserView, protocol, ipcMain, globalShortcut } = require('electron');
const mongoose = require('mongoose'); // MongoDB Client
const { Client } = require('rpc-websockets'); // WebSocket Client

let mainWindow;
let browserView;

// MongoDB Connection
const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/dnsmap');
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

// DNS Schema
const DNSSchema = new mongoose.Schema({
    domain: { type: String, required: true, unique: true }, // e.g., 'example.huh'
    path: { type: String, required: true },                // e.g., 'https://example.com/path'
});

const DNS = mongoose.model('DNS', DNSSchema);

// Initialize WebSocket Client
const rpcClient = new Client('ws://localhost:8080');

// Monitor WebSocket events
rpcClient.on('open', () => {
    console.log('Connected to RPC WebSocket server');
});
rpcClient.on('close', () => {
    console.error('WebSocket connection closed. Attempting to reconnect...');
    setTimeout(() => {
        rpcClient.connect('ws://localhost:8080');
    }, 5000);
});
rpcClient.on('error', (error) => {
    console.error('WebSocket error:', error.message);
});

// Register the virts:// protocol
async function registerVirtsProtocol() {
    protocol.registerHttpProtocol('virts', async (request, callback) => {
        const url = request.url.replace('virts://', '').trim();
        console.log(`Requested URL: ${url}`);

        try {
            // Fetch the DNS map directly from MongoDB
            const dnsEntry = await DNS.findOne({ domain: url });
            if (dnsEntry && dnsEntry.path.startsWith('http')) {
                console.log('Redirecting to custom URL from DB:', dnsEntry.path);
                callback({ url: dnsEntry.path });
            } else {
                // Fallback to regular web domain if not found in the database
                const regularUrl = `https://${url}`;
                console.log('Redirecting to regular web URL:', regularUrl);
                callback({ url: regularUrl });
            }
        } catch (error) {
            console.error('Error fetching DNS map from DB:', error);
            callback({ url: 'https://your-500-page-url.com' }); // Fallback error page
        }
    });
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        frame: true,
    });

    mainWindow.setMenuBarVisibility(false);

    // Create and attach a BrowserView
    browserView = new BrowserView();
    mainWindow.setBrowserView(browserView);

    browserView.setBounds({ x: 0, y: 50, width: 1200, height: 750 });

    mainWindow.on('resize', () => {
        const { width, height } = mainWindow.getContentBounds();
        browserView.setBounds({ x: 0, y: 50, width, height: height - 50 });
    });

    browserView.webContents.loadURL('about:blank');
    mainWindow.loadFile('toolbar.html');

    // Handle navigation events
    ipcMain.on('navigate-back', () => {
        if (browserView.webContents.navigationHistory.canGoBack()) browserView.webContents.navigationHistory.goBack();
    });
    ipcMain.on('navigate-forward', () => {
        if (browserView.webContents.navigationHistory.canGoForward()) browserView.webContents.navigationHistory.goForward();
    });
    ipcMain.on('reload', () => {
        browserView.webContents.reload();
    });
    ipcMain.on('navigate-to', (event, url) => {
        const fullUrl = url.startsWith('http') || url.startsWith('virts://') ? url : `https://${url}`;
        console.log(`Navigating to: ${fullUrl}`);
        browserView.webContents.loadURL(fullUrl);
    });

    globalShortcut.register('Control+F12', () => {
        if (mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools();
        } else {
            mainWindow.webContents.openDevTools();
        }
    });
}

app.on('ready', async () => {
    await connectDB(); // Connect to MongoDB
    await registerVirtsProtocol(); // Register the custom protocol
    createMainWindow(); // Create the main window
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
