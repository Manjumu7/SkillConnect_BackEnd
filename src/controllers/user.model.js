import { User } from "../models/user.model.js"

export const getMyDetails = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-expertise -friends -__v -updatedAt")
        if (!user) return res.status(404).json({ message: "User not found" })

        return res.status(200).json({ message: "Details fetched", user })
    } catch (error) {
        console.error("User Deyails", error)
        return res.status(500).json({ message: "Failed" })
    }
}