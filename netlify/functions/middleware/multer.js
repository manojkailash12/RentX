const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const baseUploadPath = '/tmp/uploads';
  const carsDir = path.join(baseUploadPath, 'cars');
  const usersDir = path.join(baseUploadPath, 'users');

  try {
    if (!fs.existsSync(baseUploadPath)) {
      fs.mkdirSync(baseUploadPath, { recursive: true });
    }
    if (!fs.existsSync(carsDir)) {
      fs.mkdirSync(carsDir, { recursive: true });
    }
    if (!fs.existsSync(usersDir)) {
      fs.mkdirSync(usersDir, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating upload directories:', error);
  }
};

// Configure storage for serverless environment
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    ensureUploadDirs();
    const uploadPath = '/tmp/uploads';
    
    if (file.fieldname === 'image') {
      cb(null, path.join(uploadPath, 'cars'));
    } else if (file.fieldname === 'profilePicture') {
      cb(null, path.join(uploadPath, 'users'));
    } else {
      cb(null, uploadPath);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9).toString(36);
    const extension = path.extname(file.originalname);
    const sanitizedName = file.fieldname.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, sanitizedName + '_' + uniqueSuffix + extension);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: function (req, file, cb) {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'), false);
    }
  }
});

module.exports = upload;