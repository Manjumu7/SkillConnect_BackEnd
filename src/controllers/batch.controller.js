export const createBatch = async (req, res) => {
    try {
        if (!["admin", "mentor"].includes(req.user.role))
            return res.status(403).json({ message: "Access denied" });

        const { name, classAt, communityId, description, classLink } = req.body;
        if (!name || !classAt || !communityId)
            return res.status(400).json({ message: "Missing required fields" });

        if (req.user.role === "mentor") {
            const isMentor = await Enrollment.findOne({
                userId: req.user._id,
                communityId,
                role: "mentor"
            });
            if (!isMentor)
                return res.status(403).json({ message: "Not mentor of this community" });
        }

        const batch = await Batch.create({
            name,
            classAt,
            communityId,
            description,
            classLink,
            mentorId: req.user.role === "mentor" ? req.user._id : req.body.mentorId
        });

        await Enrollment.updateMany(
            { communityId, plan: "pro", status: "active" },
            { $set: { batchId: batch._id } }
        );

        res.status(201).json({ success: true, batch });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const getAllBatches = async (req, res) => {
    try {
        if (req.user.role !== "admin")
            return res.status(403).json({ message: "Only admins allowed" });

        const batches = await Batch.find()
            .populate("mentorId", "name email role")
            .populate("communityId", "name");

        res.json({ success: true, count: batches.length, batches });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getMyBatches = async (req, res) => {
    try {
        const userId = req.user._id;

        const enrollments = await Enrollment.find({ userId }).select("batchId");

        if (!enrollments.length)
            return res.json({ success: true, batches: [] });

        const batchIds = enrollments
            .map(e => e.batchId)
            .filter(Boolean);

        const batches = await Batch.find({ _id: { $in: batchIds } })
            .populate("mentorId", "name email")
            .populate("communityId", "name");

        res.json({ success: true, count: batches.length, batches });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateBatch = async (req, res) => {
    try {
        if (!["admin", "mentor"].includes(req.user.role))
            return res.status(403).json({ message: "Access denied" });

        const { batchId } = req.params;
        const { name, description, classAt, classLink, status } = req.body;

        const batch = await Batch.findById(batchId);
        if (!batch) return res.status(404).json({ message: "Batch not found" });

        if (req.user.role === "mentor" && batch.mentorId.toString() !== req.user._id.toString())
            return res.status(403).json({ message: "Not assigned to this batch" });

        const updateData = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (classAt) updateData.classAt = classAt;
        if (classLink) updateData.classLink = classLink;
        if (status && req.user.role === "admin") updateData.status = status;

        if (!Object.keys(updateData).length)
            return res.status(400).json({ message: "No valid fields to update" });

        const updated = await Batch.findByIdAndUpdate(batchId, updateData, {
            new: true,
            runValidators: true
        });

        res.json({ success: true, batch: updated });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const deleteBatch = async (req, res) => {
    try {
        if (!["admin", "mentor"].includes(req.user.role))
            return res.status(403).json({ message: "Access denied" });

        const { batchId } = req.params;

        const batch = await Batch.findById(batchId);
        if (!batch || batch.isDeleted) return res.status(404).json({ message: "Batch not found" });

        if (req.user.role === "mentor" && batch.mentorId.toString() !== req.user._id.toString())
            return res.status(403).json({ message: "Not assigned to this batch" });

        batch.isDeleted = true;
        await batch.save();

        res.json({ success: true, message: "Batch deleted" });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const removeStudentFromBatch = async (req, res) => {
    try {
        if (!["admin", "mentor"].includes(req.user.role))
            return res.status(403).json({ message: "Access denied" });

        const { communityId, userId } = req.params;

        const enrollment = await Enrollment.findOne({ userId, communityId });
        if (!enrollment || !enrollment.batchId)
            return res.status(404).json({ message: "Student not in any batch" });

        const batch = await Batch.findById(enrollment.batchId);
        if (!batch || batch.isDeleted)
            return res.status(404).json({ message: "Batch not found" });

        if (
            req.user.role === "mentor" &&
            batch.mentorId.toString() !== req.user._id.toString()
        )
            return res.status(403).json({ message: "Not your batch" });

        enrollment.batchId = null;
        await enrollment.save();

        res.json({ success: true, message: "Student removed from batch" });

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
