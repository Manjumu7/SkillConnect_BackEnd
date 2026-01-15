import app from "./src/app.js";
import connectDB from "./src/utils/db.js";

connectDB()

app.listen(4000,()=>{
    console.log("server is running on port 4000")
})