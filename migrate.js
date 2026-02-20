import mongoose from "mongoose";
import { Community } from "./src/models/community.modrl.js";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
 
await mongoose.connect("mongodb+srv://skillconnect:skillconnect@skillconnect.cf9p4ix.mongodb.net/?appName=SkillConnect");

await Community.updateMany(
    {},
    {
        $set: {
            students: [],
            mentors: [],
            projects: []
        }
    }
);

console.log("Migration completed");
process.exit();