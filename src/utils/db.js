import mongoose from "mongoose";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("mongo is connected");
    } catch (error) {
        console.error("failed to connect", error);
        process.exit(1);
    }
};

export default connectDB;
