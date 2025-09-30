const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIRECTORY = 'public/uploads/vistorias/';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        fs.mkdirSync(UPLOAD_DIRECTORY, { recursive: true });
        cb(null, UPLOAD_DIRECTORY);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname.replace(/\[|\]/g, '') + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Formato de arquivo não suportado! Envie apenas imagens.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 }
});

module.exports = upload;
