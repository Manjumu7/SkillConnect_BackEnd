import mongoose from "mongoose";
const projectSchema = new mongoose.schema({
    name:{
        type:String,
        required:true,
    },
description:{
    type:string,
    required:true,
    trim:true,
    maxlength:1000
}

})