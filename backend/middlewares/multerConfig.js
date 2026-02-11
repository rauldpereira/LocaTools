const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let uploadPath = 'public/uploads/others/';

        // Se o campo do formulário se chamar 'image', é equipamento
        if (file.fieldname === 'image' || file.fieldname === 'images') {
            uploadPath = 'public/uploads/equipments/';
        }
        // Se for 'fotos' é vistoria
        else if (file.fieldname.includes('foto')) {
            uploadPath = 'public/uploads/vistorias/';
        }

        // Cria a pasta se não existir
        fs.mkdirSync(uploadPath, { recursive: true });

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Limpa caracteres estranhos do nome do campo
        const fieldNameClean = file.fieldname.replace(/\[|\]/g, '');
        cb(null, fieldNameClean + '-' + uniqueSuffix + path.extname(file.originalname));
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
    limits: { fileSize: 1024 * 1024 * 5 } // Limita em 5MB o arquivo
});

module.exports = upload; 1