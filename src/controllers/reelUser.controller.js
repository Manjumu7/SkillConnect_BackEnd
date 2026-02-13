import cloudinary from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { Reel } from "../models/reels.model.js";

// Upload profile or cover image for the current user
const uploadUserImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "No image uploaded",
      });
    }

    const file = req.files[0];
    const { type } = req.body;

    if (!type || !["profile", "cover"].includes(type)) {
      return res.status(400).json({
        message: "Invalid or missing image type. Must be 'profile' or 'cover'",
      });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: type === "profile" ? "profile_images" : "cover_images",
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(file.buffer);
    });

    if (type === "profile") {
      req.user.profileImage = result.secure_url;
    } else {
      req.user.coverImage = result.secure_url;
    }

    await req.user.save();

    res.status(200).json({
      success: true,
      message: `${type} image uploaded successfully`,
      imageUrl: result.secure_url,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload image",
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { bio, fullName } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { bio, fullName },
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password -__v")
      .lean();

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching your profile",
      error: error.message,
    });
  }
};

const myReels = async (req, res) => {
  try {
    const userId = req.user._id;

    const reels = await Reel.find({ creator: userId })
      .populate("creator", "username profileImage")
      .sort({ createdAt: -1 });

    return res.status(200).json(reels);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch reels" });
  }
};



export {
  uploadUserImage,
  getMyProfile,
  updateProfile,
  myReels,
};

