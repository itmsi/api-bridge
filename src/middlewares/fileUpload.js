const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  // Allow specific file types for PowerBI reports
  const allowedTypes = [
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/pdf', // .pdf
    'text/csv', // .csv
    'application/json', // .json
    'application/xml', // .xml
    'text/xml', // .xml
    'application/zip', // .zip
    'application/x-zip-compressed', // .zip
    'application/octet-stream' // .pbix and other binary files
  ];

  // Check file extension as fallback
  const allowedExtensions = ['.xls', '.xlsx', '.pdf', '.csv', '.json', '.xml', '.zip', '.pbix'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Only one file per request
  }
});

// Middleware for single file upload
const uploadSingleFile = upload.single('file');

// Middleware wrapper to handle multer errors
const handleFileUpload = (req, res, next) => {
  uploadSingleFile(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 50MB.',
          error: err.message
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          success: false,
          message: 'Too many files. Only one file is allowed.',
          error: err.message
        });
      }
      return res.status(400).json({
        success: false,
        message: 'File upload error',
        error: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: 'File validation error',
        error: err.message
      });
    }
    next();
  });
};

// Generate unique filename
const generateFileName = (originalName) => {
  const timestamp = Date.now();
  const uuid = uuidv4();
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension);
  
  // Sanitize filename
  const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  return `powerbi/${timestamp}_${uuid}_${sanitizedName}${extension}`;
};

// Get content type based on file extension
const getContentType = (filename) => {
  const extension = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pdf': 'application/pdf',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.zip': 'application/zip',
    '.pbix': 'application/octet-stream'
  };
  
  return contentTypes[extension] || 'application/octet-stream';
};

module.exports = {
  handleFileUpload,
  generateFileName,
  getContentType
};
