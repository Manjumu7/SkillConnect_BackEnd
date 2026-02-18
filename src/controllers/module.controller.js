import { Community } from "../models/community.modrl.js";

export const addModule = async (req, res) => {
    try {
        const { communityId } = req.params;

        const updatedCommunity = await Community.findByIdAndUpdate(
            communityId,
            { $push: { modules: req.body } },
            { new: true }
        );

        if (!updatedCommunity) {
            return res.status(404).json({ message: "Community not found" });
        }

        res.json(updatedCommunity);
    } catch (err) {
        res.status(500).json({ message: "Failed to add module" });
    }
};

// Delete a module
export const deleteModule = async (req, res) => {
    try {
        const { communityId, moduleId } = req.params;

        const updatedCommunity = await Community.findByIdAndUpdate(
            communityId,
            { $pull: { modules: { _id: moduleId } } },
            { new: true }
        );

        if (!updatedCommunity) {
            return res.status(404).json({ message: "Community not found" });
        }

        res.json(updatedCommunity);
    } catch (err) {
        res.status(500).json({ message: "Failed to delete module" });
    }
};

// Update a module
export const updateModule = async (req, res) => {
    try {
        const { communityId, moduleId } = req.params;

        const community = await Community.findOneAndUpdate(
            {
                _id: communityId,
                "modules._id": moduleId
            },
            {
                $set: {
                    "modules.$.title": req.body.title,
                    "modules.$.description": req.body.description,
                    "modules.$.topics": req.body.topics
                }
            },
            { new: true }
        );

        if (!community) {
            return res.status(404).json({ message: "Module or community not found" });
        }

        res.json(community);
    } catch (err) {
        res.status(500).json({ message: "Failed to update module" });
    }
};
