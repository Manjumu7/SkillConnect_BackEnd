import { Community } from "../models/community.modrl.js";



const createCommunity = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !description) return res.status(400).json({ message: "All fields are required" });

       

            const community = await Community.create({
                name,
                description,
                createdBy: null,
                mentor_id: null,
                membersCount: 0,
                visibility: "private"
            })
        

        return res.status(201).json({message: "Community created successfully",})


    } catch (error) {
        console.error(error);
        return res.status(500).json({message: "Failed"})
    }
}

export {
    createCommunity
}