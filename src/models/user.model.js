import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        enum: ["firstName","lastName"],
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    role:{
      role:String,
      enum: ["user","mentor","company","admin"]
    },
},{timestamps:true})

export const User=mongoose.model("User",userSchema)