import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const verifyJWT = asyncHandler(async (req, _, next)=>{
    try {
        //get the access token from cookies or the request header
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        //if there is no token then throw error
        if(!token){
            throw new ApiError(401, "Unauthorized Access");
        }
    
        //verify the token
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        //find the user from the token ans also remove password ans refreshToken field
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        //if there is no user found then throw error
        if(!user){
            throw new ApiError(401, "Invalid Access Token");
        }
    
        //if user found then attach it to the request object
        req.user = user;
    
        //pass to next middleware
        next();
    } catch (error) {
        throw new ApiError( 401, error?.message || "Invalid Access Token" );
    }
});

export {verifyJWT}