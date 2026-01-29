import { User } from "../models/user.model.js"

export const getAllUsers = async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Admins only" })
        }

        const students = (await User.find()).toSorted({ createdAt: 1 })

        return res.status(200).json({ message: "Fetched all students", students })
    } catch (error) {
        console.error(error.message)
        return res.status(500).json({ message: "Failed to fetch students" })
    }
}