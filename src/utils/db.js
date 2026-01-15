import mongoose from "mongoose";

const connectDB=async()=>{
    try {
        const res=await mongoose.connect(process.env.MONGODB_URL)
        console.log("mongo is connected")
        
    } catch (error) {
        console.log("failed to connect")
        process.exit(1)
        
    }
}

export default connectDB