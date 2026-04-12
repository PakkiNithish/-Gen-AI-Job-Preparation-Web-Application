const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(), // Store files in memory as Buffer objects
    limits: {
        fileSize: 3 * 1024 * 1024
    },
});

module.exports = upload