import express from 'express';
import  dotenv  from 'dotenv';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import courseRoutes from './routes/course.routes.js';
import userRoutes from "./routes/user.routes.js";
import adminRoute from "./routes/admin.route.js";
import fileUpload from 'express-fileupload';
import cookieParser from 'cookie-parser';

const app = express();
dotenv.config();

//middleware
app.use(cookieParser());
app.use(express.json());
app.use(fileUpload({
  useTempFiles : true,
  tempFileDir : '/tmp/',
}));

const port = process.env.PORT || 4000;
const DB_URI = process.env.MONGO_URI;

try {
 await mongoose.connect(DB_URI);
 console.log('Connected to the database');
}
catch (error){
    console.log(error);
}

// defining routes
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/admin", adminRoute);

cloudinary.config({ 
  cloud_name: process.env.cloud_name, 
  api_key: process.env.api_key, 
  api_secret: process.env.api_secret 
});

app.listen(port, () => {
  console.log(`Course selling app listening on port ${port}`)
})