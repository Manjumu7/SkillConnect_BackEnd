import mongoose from "mongoose";
const batchSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        trim:true
    },
    classAt:{
        type:Date,
        required:true
    },

    mentor:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Mentor",
        required:true,
        index:true
    },
    status:{
        type:String,
        enum:["upcomming","ongoing","completed"],
        default:"upcomming",
    },
    classLink:{
        type:String,
    },
    communityId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Community",
        required:true
    }


},{timestamps:true})

export const batch = mongoose.model("batch", batchSchema)