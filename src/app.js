import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

//middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials:true
})); //for cors
app.use(express.json({limit: "16kb"})); //for parsing json/form data with limit
app.use(urlencoded({extended: true, limit: "16kb"} )); //for parsing url data
app.use(express.static("public")) //for static files
app.use(cookieParser()) //for working with cookies

//routes import 
import userRouter from "./routes/user.router.js";

//routes declaration
app.use("/api/v1/users", userRouter);

export {app};