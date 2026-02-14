import dotenv from "dotenv";
dotenv.config();
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("Cloudinary configured:", {
    cloud: process.env.CLOUDINARY_CLOUD_NAME,
    key: process.env.CLOUDINARY_API_KEY,
});

// helper function
export const uploadToCloudinary = (buffer, folder, resourceType) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream(
                { folder, resource_type: resourceType },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            )
            .end(buffer);
    });
};

// default export
export default cloudinary;
