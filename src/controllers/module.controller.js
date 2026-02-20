import { Community } from "../models/community.modrl.js";

const toEmbedUrl = (url) => {
    if (!url) return "";

    if (url.includes("youtube.com/embed")) return url;

    // convert watch?v= to embed
    const match = url.match(/v=([^&]+)/);
    if (match) {
        return `https://www.youtube.com/embed/${match[1]}`;
    }

    return url; // fallback
};

export const addModule = async (req, res) => {
    try {
        const { communityId } = req.params;
        const { title, description, topics, youtubeUrl } = req.body;

        const newModule = {
            title,
            description,
            topics,
            youtubeUrl: toEmbedUrl(youtubeUrl)
        };

        const updatedCommunity = await Community.findByIdAndUpdate(
            communityId,
            { $push: { modules: newModule } },
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


// Update a module
export const updateModule = async (req, res) => {
    try {
        const { communityId, moduleId } = req.params;
        const { title, description, topics, youtubeUrl } = req.body;

        const community = await Community.findOneAndUpdate(
            {
                _id: communityId,
                "modules._id": moduleId
            },
            {
                $set: {
                    "modules.$.title": title,
                    "modules.$.description": description,
                    "modules.$.topics": topics,
                    "modules.$.youtubeUrl": toEmbedUrl(youtubeUrl)
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