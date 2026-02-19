import multer from "multer";

const storage = multer.memoryStorage();

// Allowed MIME types
const allowedMimeTypes = [
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",

  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",

  // Documents
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "text/plain"
];

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Only videos, images, and common document formats are allowed"
        )
      );
    }
    cb(null, true);
  },
});
