import express from "express"
import dotenv from "dotenv"
const app = express()

dotenv.config() // to use env files

app.use("/",(req,res)=>{
    res.send ("welcome to fist page")
})

export default app;