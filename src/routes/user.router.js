import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, updateAccountDetails, getCurrentUser, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import {verifyJWT} from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
);

router.route("/login").post(loginUser);

//secured routes

router.route("/logout").post(verifyJWT , logoutUser);

router.route("/refresh-token").post(refreshAccessToken);

router.route("/get-user").get(verifyJWT, getCurrentUser);

router.route("/change-password").patch(verifyJWT,  changeCurrentPassword );

router.route("/update-user").patch(verifyJWT,  updateAccountDetails );

router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router.route("/update-coverimage").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

//routes getting params deta
router.route("/channel/:username").get(verifyJWT, getUserChannelProfile);

router.route("/history").get(verifyJWT, getWatchHistory);

export default router;