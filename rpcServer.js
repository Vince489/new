const WebSocket = require('rpc-websockets').Server;
const mongoose = require('mongoose');
const DNS = require('./models/DNS'); // Your DNS model

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

// Start the RPC WebSocket Server
const startServer = async () => {
    await connectDB();

    const server = new WebSocket({
        port: 8080,
        host: 'localhost',
    });

    console.log('RPC WebSocket server running on ws://localhost:8080');

    // Register an RPC method to fetch the DNS map
    server.register('getDNSMap', async () => {
        try {
            const dnsEntries = await DNS.find(); // Fetch all DNS entries
            console.log('DNS Map Fetched:', dnsEntries);
            return dnsEntries;
        } catch (error) {
            console.error('Error fetching DNS entries:', error);
            throw { code: -32000, message: 'Error fetching DNS map', data: error.message };
        }
    });
};

startServer();
