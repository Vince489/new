const mongoose = require('mongoose');

// Define the DNS schema
const DNSSchema = new mongoose.Schema({
    domain: { type: String, required: true, unique: true }, // e.g., 'example.huh'
    path: { type: String, required: true },                // e.g., '/path/to/file.html'
});

// Export the model
module.exports = mongoose.model('DNS', DNSSchema);
