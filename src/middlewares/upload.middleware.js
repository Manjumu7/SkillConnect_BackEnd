import multer from "multer";

const storage = multer.memoryStorage();

const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/mpeg",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

export const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!allowedMimeTypes.includes(file.mimetype)) {
            cb(new Error("Unsupported file type"));
        } else {
            cb(null, true);
        }
    }
});
