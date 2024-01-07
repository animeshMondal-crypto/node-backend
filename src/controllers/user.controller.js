import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// generate access and refresh token function
const generateAccessAndRefreshTokens = async(userId)=>{
        try {
            const user = await User.findById(userId);
            const accessToken = user.generateAccessToken();
            const refreshToken = user.generateRefreshToken();

            user.refreshToken = refreshToken;
            await user.save({ validateBeforeSave: false });

            return {accessToken, refreshToken};
        } catch (error) {
            console.log(error);
            throw new ApiError(500, "something went wrong while generating access and refresh tokens");
        }
}

const registerUser = asyncHandler(async (req, res)=>{
    //! steps to user register
    //? get user details from frontend
    //? validate user details
    //? check if user already exists
    //? check for images, check for avatar
    //? upload them for cloudinary
    //? create user object-create entry in db
    //? remove password ans response token field from response
    //? check for user creation
    //? return response
    
    const {fullName, email, username, password} = req.body;

    // validate user details
    if(
        [fullName, email, username, password].some((field)=>
        field?.trim()==="")
    ){ //this condition checks if any field is empty
        throw new ApiError(400, "All fields are required!");
    }

    // check if user already exists
    const existingUser = await User.findOne({
        $or:[{ username }, { email }] //it uses or property either email or username is existing
    });
    if(existingUser){
        throw new ApiError(409, "User already exists");
    }

    //get images
    // console.log(req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path; //this lines gives error when coverImage is not sent because we are checking from undefined
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }
    

    //check for avatar image because that is required
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar image is required!");
    }

    //upload images to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400, "Avatar image is required!");
    }

    //create user object
    const user = await User.create({
        fullName, 
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        username: username.toLowerCase(),
        password
    });

    //check if the user is created and remove password ans refreshToken from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken"); //this select method removes the fields which are selected here we are selecting password and refreshToken with - sign

    if(!createdUser){
        throw new ApiError(500, "Something went wrong when registering!!");
    }

    // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res)=>{
    //! steps to user login
    //? get user details from req.body
    //? username or email based login
    //? check if user exists
    //? validate password
    //? generate access and refresh token
    //? send cookies
    //? send the user

    //get the user
    const {email, username, password} = req.body;
    if(!username && !email){
        throw new ApiError(400, "Username or password is required");
    }

    //check if user exists
    const user = await User.findOne({
        $or: [{username}, {email}]
    });
    if(!user){
        throw new ApiError(404, "User does not exist");
    }

    //validate password
    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if(!isPasswordCorrect){
        throw new ApiError(401, "Invalid credentials");
    }

    //generate access and refresh tokens
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

    //again query user to db because current user does not have refresh token and we need to remove the password also
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    //save cookies
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse (
        200, 
        {
            user: loggedInUser,
            accessToken,
            refreshToken
        },
        "User logged in successfully"
    ));
})

const logoutUser = asyncHandler(async (req, res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken: 1 //this removes the refresh token
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };
    //clear cookies and return response
    return res
    .status(200)
    .clearCookie("accessToken", options )
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "Logged out successfully")
    )


})

const refreshAccessToken = asyncHandler(async (req, res)=>{
    //get the refreshToken from cookie
    const cookieRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if(!cookieRefreshToken){
        throw new ApiError(401, "unauthorized request");
    }

   try {
     //decode refreshToken
     const decodedToken = jwt.verify(cookieRefreshToken, process.env.REFRESH_TOKEN_SECRET);
 
     if(!decodedToken){
         throw new ApiError(401, "unauthorized request");
     }
     
     //get the user from the db
     const user = await User.findById(decodedToken._id);
     
     if(!user){
         throw new ApiError(401, "Invalid refresh token");
     }
     
     //check if both refreshTokens are same
     if(cookieRefreshToken !== user?.refreshToken){
         throw new ApiError(401, "Refresh token is expired or used");
     }
 
     //generate new access and refresh tokens
     const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);
 
     //set the cookie and return the response
     const options = {
         httpOnly: true,
         secure: true,
     };
 
     return res
     .status(200)
     .cookie("accessToken", accessToken, options)
     .cookie("refreshToken", refreshToken, options)
     .json(
         new ApiResponse(200, {accessToken, refreshToken}, "AccessToken changed successfully")
     )
   } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
   }

})

const changeCurrentPassword = asyncHandler(async (req, res)=>{
    const {currentPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id);

    if(!user){
        throw new ApiError(400, "Unauthorized access");
    }

    const validatePassword = await user.isPasswordCorrect(currentPassword);

    if(!validatePassword){
        throw new ApiError(400, "Incorrect Password");
    }

    user.password = newPassword;
    user.save();

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Password Changed Successfully")
    );
})

const getCurrentUser = asyncHandler(async (req, res)=>{
    return res
    .status(200)
    .json(
        new ApiResponse(200, req.user, "User fetched")
    );
})

const updateAccountDetails = asyncHandler(async (req, res)=>{
    const {fullName, email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Fields updated successfully")
    );
})

const updateUserAvatar = asyncHandler(async (req, res)=>{
    const avatarLocalPath = req.file.path;
    const oldAvatarPublicId = req.user.avatar.split("/")[7].split(".")[0];

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar image is required");
    }

    //delete old image from cloudinary
    await deleteFromCloudinary(oldAvatarPublicId);
    
    //upload new image
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    
    if(!avatar){
        throw new ApiError(400, "Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "avatar updated successfully")
    );
})

const updateUserCoverImage = asyncHandler(async (req, res)=>{
    const coverImageLocalPath = req.file.path;

    const oldCoverImagePublicId = req.user.coverImage?.split("/")[7].split(".")[0] || "";

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image is required");
    }
    
    //delete old cover image
    await deleteFromCloudinary(oldCoverImagePublicId);

    //upload new image
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    
    if(!coverImage){
        throw new ApiError(400, "Error while uploading cover image");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "cover image updated successfully")
    );
})

const getUserChannelProfile = asyncHandler(async (req, res)=>{
    const {username} = req.params;

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedToChannels"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedToChannels"
                },
                isSubscribed:{
                    if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                    then: true,
                    else: false
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel does not exists");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    );

})

const getWatchHistory = asyncHandler(async (req, res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first: "$owner"
                }
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully")
    );
})

export {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}