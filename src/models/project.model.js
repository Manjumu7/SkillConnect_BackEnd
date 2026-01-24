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
},
due_date:{
    type:Date,
    required:true,
},
mentorId:{
    type:mongoose.schema.type.ObjectId,
    required:true,
    ref:"Mentor"
},
communityId:{
    type:mongoose.schema.Type.ObjectId,
    required:true,
    ref:"Community"
},
status:{
    type:String,
    enum:["open","Close"],
    default:"open"
},
isDeleted:{
    type:Boolean,
    default:false
}
})
export const Project = mongoose.model("Project",projectSchema)