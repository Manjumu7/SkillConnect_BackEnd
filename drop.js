import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

await mongoose.connect(process.env.MONGODB_URL);
console.log("Connected");

await mongoose.connection.collection('users').dropIndex('username_1');
console.log("Index dropped successfully");

await mongoose.disconnect();
process.exit(0);