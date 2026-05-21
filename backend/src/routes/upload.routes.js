const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { verifyToken } = require("../middleware/auth.middleware");

const router = express.Router();
const uploadDir = path.resolve(process.env.FILE_STORAGE_PATH || path.join(__dirname, "..", "..", "uploads"));
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DANGEROUS_EXTENSIONS = new Set([
  ".bat",
  ".cmd",
  ".com",
  ".exe",
  ".js",
  ".msi",
  ".ps1",
  ".scr",
  ".sh",
  ".vbs",
]);

fs.mkdirSync(uploadDir, { recursive: true });

const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME
  && process.env.CLOUDINARY_API_KEY
  && process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(extension)) {
      return cb(new Error("Executable or script files are not allowed"));
    }

    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Unsupported file type"));
  },
});

const handleUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();

    const statusCode = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "File size must be 10MB or less"
      : error.message;

    return res.status(statusCode).json({ success: false, message });
  });
};

const uploadToCloudinary = (file) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    {
      folder: process.env.CLOUDINARY_FOLDER || "itpm-task-attachments",
      resource_type: "auto",
      use_filename: true,
    },
    (error, result) => {
      if (error) reject(error);
      else resolve(result);
    }
  );

  stream.end(file.buffer);
});

const saveLocalFile = (req, file) => {
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;
  fs.writeFileSync(path.join(uploadDir, fileName), file.buffer);
  const publicBaseUrl = process.env.FILE_PUBLIC_BASE_URL
    ? process.env.FILE_PUBLIC_BASE_URL.replace(/\/$/, "")
    : `${req.protocol}://${req.get("host")}/uploads`;

  return {
    fileUrl: `${publicBaseUrl}/${fileName}`,
    storageKey: fileName,
  };
};

router.post("/", verifyToken, handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "file is required" });
    }

    let fileUrl;
    let storageKey = "";
    if (hasCloudinaryConfig) {
      const uploaded = await uploadToCloudinary(req.file);
      fileUrl = uploaded.secure_url;
      storageKey = uploaded.public_id;
    } else {
      const saved = saveLocalFile(req, req.file);
      fileUrl = saved.fileUrl;
      storageKey = saved.storageKey;
    }

    res.status(201).json({
      success: true,
      data: {
        file_url: fileUrl,
        file_name: req.file.originalname,
        file_type: req.file.mimetype,
        size: req.file.size,
        uploaded_by: req.user.userId,
        uploaded_at: new Date(),
        storage_key: storageKey,
        preview_url: fileUrl,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
