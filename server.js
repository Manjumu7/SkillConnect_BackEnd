import dotenv from "dotenv";
dotenv.config();   // MUST be first

import "./src/utils/cloudinary.js";  // config runs after env loads

import app from "./src/app.js";
import connectDB from "./src/utils/db.js";

connectDB();

console.log("Cloudinary key:", process.env.CLOUDINARY_API_KEY);

app.listen(4000, () => {
    console.log("server is running on port 4000");
});
