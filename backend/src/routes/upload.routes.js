const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { verifyToken } = require("../middleware/auth.middleware");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "..", "uploads");

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
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Unsupported file type"));
  },
});

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

  return `${req.protocol}://${req.get("host")}/uploads/${fileName}`;
};

router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "file is required" });
    }

    let fileUrl;
    if (hasCloudinaryConfig) {
      const uploaded = await uploadToCloudinary(req.file);
      fileUrl = uploaded.secure_url;
    } else {
      fileUrl = saveLocalFile(req, req.file);
    }

    res.status(201).json({
      success: true,
      data: {
        file_url: fileUrl,
        file_name: req.file.originalname,
        file_type: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
