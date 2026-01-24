import { User } from "../models/user.model.js"
import bcrypt from "bcryptjs"

const registerUser = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "all features requrire"
            })
        }

        const oldUser = await User.findOne({email})
        if (oldUser){
            return res.status(404).json({
                message:"user is already regiested"
            })
        }

        const hashPassword=await bcrypt.hash(password,10)

        const user=await User.create({
            name,
            email,
            password: hashPassword,
            role: "user",
            phone
        })

        return res.status(201).json({
            message:"user created successfully",
            user
        })

        
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({
            message:"failed to create user"
        })
    }
}

export{
    registerUser
}