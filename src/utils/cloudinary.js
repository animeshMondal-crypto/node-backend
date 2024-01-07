import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});


const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null;
        //! upload on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{resource_type: "auto"});
    
        // console.log("file uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath); //delete the local file
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); //! it deletes the locally saved temporary file if upload fails
        console.log("Error uploading file to cloudinary ", error);
        return null;
    }
}

const deleteFromCloudinary = async (public_id)=>{
    if(!public_id) return null;
    
    await cloudinary.uploader.destroy(public_id, {resource_type: "image"});
}

export {uploadOnCloudinary, deleteFromCloudinary}



//!cloudinary website example code
// cloudinary.v2.uploader.upload("https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   { public_id: "olympic_flag" }, 
//   function(error, result) {console.log(result); });