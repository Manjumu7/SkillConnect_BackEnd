import { User } from "../models/user.model"
import bcrypt from "bcryptjs"

const registerUser = async (req, res) => {
    try {
        const { fullName, email, password } = req.body
        if (!fullName || !email || !password) {
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

        const hashPassword=bcrypt.hash(password,10)

        const user=await User.create({
            fullName,
            email,
            password: hashPassword,
            role: "user"
        })

        return res.status(201).json({
            message:"user created successfully",
            user
        })

        
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            message:"failed to create user"
        })
    }
}