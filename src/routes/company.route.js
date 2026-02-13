import express from "express";
import verifyToken from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/authRole.middleware";


const router = express.Router();

router.get("/", getAllCompanies);
router.get("/:id", getCompanyById);

router.post(
    "/",
    verifyToken,
    authorizeRoles("company"),
    upload.single("banner"),
    createCompany
);

router.put(
    "/:id",
    protect,
    authorize("company"),
    upload.single("banner"),
    updateCompany
);

router.delete(
    "/:id",
    protect,
    authorize("company"),
    softDeleteCompany
);

export default router;
