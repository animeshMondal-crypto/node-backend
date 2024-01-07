import dotenv from "dotenv";
import { connectDB } from "./db/db.js";
import { app } from "./app.js";

dotenv.config({
    path:"./.env"
});

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server listening on port ${process.env.PORT}`);
    });

    app.on("error", (error) => {
        console.error("Server connection Error ", error);
    });
})
.catch((err)=>{
    console.log("DB connection failed", err);
    process.exit(1);
})


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