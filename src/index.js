import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./db/db.js";

dotenv.config({
    path:"./env"
});

connectDB();


/* 
    Another way to connect to mongodb iife
    
    (async ()=>{
        try{
            await mongoose.connect(${process.env.MONGODB_URI}/${DB_NAME});
        }catch(err){
            console.error("MongoDB Connection Failed ", err);
            throw err;
        }
    })()
*/