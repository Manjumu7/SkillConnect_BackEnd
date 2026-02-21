import mongoose from "mongoose";
import { Reel } from "../models/reels.model.js";
import cloudinary from "../utils/cloudinary.js";

// Upload a new reel video
const uploadReel = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!req.file) return res.status(400).json({ message: "Video file not uploaded" });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: "reelsFolder",
          eager: [{ format: "mp4", quality: "auto" }],
          eager_async: true,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const { title, description, tags, category } = req.body;

    // FIX: Use primary secure_url if eager isn't ready yet
    const finalVideoUrl = result.eager?.[0]?.secure_url || result.secure_url;

    const reel = await Reel.create({
      title,
      description,
      tags,
      category,
      videoUrl: finalVideoUrl,
      creator: req.user._id, // Ensure your Schema uses 'creator'
      thumbnail: cloudinary.url(result.public_id, {
        resource_type: "video",
        format: "jpg",
        transformation: [{ width: 300, height: 500, crop: "fill" }],
      }),
    });

    return res.status(200).json({ message: "Reel uploaded successfully", reel });
  } catch (error) {
    console.error("DETAILED UPLOAD ERROR:", error); // Check your terminal for this!
    return res.status(500).json({
      message: error.message || "Failed to upload reel",
    });
  }
};




// Get all reels (no Redis cache; direct DB query)
const getAllReels = async (req, res) => {
  try {
    const allReels = await Reel.find()
      .populate("creator", "username profileImage")
      .sort({ createdAt: -1 });

    if (allReels.length === 0) {
      return res.status(200).json({
        message: "No reels available",
        allReels: [],
      });
    }

    return res.status(200).json({
      message: "All Reels fetched successfully",
      allReels,
    });
  } catch (error) {
    console.error("Error fetching reels:", error);
    return res.status(500).json({ message: "Failed to fetch reels" });
  }
};

// Delete a reel (and its Cloudinary asset)
const deleteReel = async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id);

    if (!reel) return res.status(404).json({ message: "Reel not found" });

    const publicId = reel.videoUrl
      .split("/")
      .slice(-2)
      .join("/")
      .split(".")[0];

    await cloudinary.uploader.destroy(publicId, { resource_type: "video" });

    await Reel.findByIdAndDelete(id);

    res.status(200).json({ message: "Reel deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete reel" });
  }
};

const getReelById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "No id provided to fetch" });
    }

    const reel = await Reel.findById({ _id: id });
    if (!reel) {
      return res
        .status(404)
        .json({ message: "Invalid id or reel not available" });
    }

    return res
      .status(200)
      .json({ message: "Reel fetched by Id successfully", reel });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch reel" });
  }
};

const updateReel = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, thumbnail, tags } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (thumbnail) updateData.thumbnail = thumbnail;
    if (tags) updateData.tags = tags;

    const updatedReel = await Reel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedReel) {
      return res.status(404).json({ message: "Reel not found" });
    }

    return res.status(200).json({
      message: "Reel updated successfully",
      updatedReel,
    });
  } catch (error) {
    console.error("Update reel error:", error);
    return res.status(500).json({ message: "Failed to update reel" });
  }
};

const getReelsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "User id is required" });
    }

    const reels = await Reel.find({ creator: userId })
      .sort({ createdAt: -1 })
      .populate("creator", "username profileImage");

    if (!reels || reels.length === 0) {
      return res
        .status(404)
        .json({ message: "Reels not found for this user" });
    }

    return res.status(200).json({ reels });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user reels" });
  }
};

const getTrendingReels = async (req, res) => {
  try {
    const reels = await Reel.aggregate([
      {
        $addFields: {
          likeCount: { $size: "$likes" },
          totalEngagement: { $add: [{ $size: "$likes" }, "$views"] },
        },
      },
      { $sort: { totalEngagement: -1, createdAt: -1 } },
      { $limit: 20 },
    ]);

    if (!reels || reels.length === 0) {
      return res.status(404).json({ message: "No trending reels found" });
    }

    return res.status(200).json({ reels });
  } catch (error) {
    console.error("Error fetching trending reels:", error);
    return res.status(500).json({ message: "Failed to fetch trending reels" });
  }
};

const incrementViews = async (req, res) => {
  try {
    const { reelId } = req.params;
    if (!reelId) {
      return res.status(400).json({ message: "Reel id is required" });
    }

    const updatedViews = await Reel.findByIdAndUpdate(
      reelId,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!updatedViews) {
      return res.status(404).json({ message: "Reel not found" });
    }
    return res.status(200).json({ message: "View updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to add view" });
  }
};

const getTotalViewsOfCreator = async (req, res) => {
  try {
    const { creatorId } = req.params;
    const result = await Reel.aggregate([
      {
        $match: {
          creator: new mongoose.Types.ObjectId(creatorId),
        },
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" },
        },
      },
    ]);
    const totalViews = result.length > 0 ? result[0].totalViews : 0;
    res.status(200).json({ totalViews });
  } catch (error) {
    console.error("Error fetching total views:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const likeUnlikeReel = async (req, res) => {
  try {
    const userId = req.user._id;
    const reelId = req.params.id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({ error: "Reel not found" });
    }

    let liked;

    if (reel.likes.includes(userId)) {
      reel.likes.pull(userId);
      liked = false;
    } else {
      reel.likes.push(userId);
      liked = true;
    }

    await reel.save();

    const updatedReel = await Reel.findById(reelId).populate(
      "creator",
      "username profileImage"
    );

    return res.status(200).json({
      liked,
      likes: updatedReel.likes,
      totalLikes: updatedReel.likes.length,
      reel: updatedReel,
    });
  } catch (error) {
    console.error("Error liking/unliking reel:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export {
  uploadReel,
  deleteReel,
  getAllReels,
  getReelById,
  updateReel,
  getReelsByUser,
  getTrendingReels,
  incrementViews,
  getTotalViewsOfCreator,
  likeUnlikeReel,
};

