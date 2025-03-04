const multer = require('multer');
const path = require('path');

// إعداد Multer لتخزين الملفات
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let destinationPath;

        // تحديد المجلد بناءً على نوع الملف
        const fileType = file.mimetype.split('/')[0];
        if (fileType === 'image') {
            destinationPath = 'files/images/';
            file.destinationFolder = 'images';
        } else if (['application'].includes(fileType)) {
            destinationPath = 'files/documents/';
            file.destinationFolder = 'documents';
        } else {
            return cb(new Error('Unsupported file type!'), false);
        }

        cb(null, destinationPath);
    },
    filename: (req, file, cb) => {
        const fileType = file.mimetype.split('/')[0];
        let folderName = fileType === 'image' ? 'images' : 'documents/';

        // تضمين الموقع ضمن اسم الملف
        cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`);
    }
});

// تحديد أنواع الملفات المسموح بها
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/jpg',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only images, PDFs, Word, and PowerPoint files are allowed!'), false);
    }
};

// إعداد Multer
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    // limits: { fileSize: 10 * 1024 * 1024 } // الحد الأقصى لحجم الملف (10MB)
});

module.exports = upload;
