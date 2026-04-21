import express from 'express';
import  dotenv  from 'dotenv';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import courseRoutes from './routes/course.routes.js';
import userRoutes from "./routes/user.routes.js";
import adminRoute from "./routes/admin.route.js";
import noteRoutes from "./routes/note.routes.js";
import fileUpload from 'express-fileupload';
import cookieParser from 'cookie-parser';
import cors from "cors";
import compression from "compression";
import helmet from "helmet";

const app = express();
dotenv.config();
//middleware
app.disable("x-powered-by");

const rawAllowedOrigins = [
  process.env.FRONTEND_URL1,
  process.env.FRONTEND_URL2,
  process.env.FRONTEND_URL3,
].filter(Boolean);

const allowedOrigins = rawAllowedOrigins.map((o) => String(o).replace(/\/+$/, ""));

const cspDefaults = helmet.contentSecurityPolicy.getDefaultDirectives();
// Avoid duplicate frame-ancestors directives (some environments/frameworks may inject one)
delete cspDefaults.frameAncestors;
delete cspDefaults["frame-ancestors"];

app.use(
  helmet({
    // Helmet otherwise sets X-Frame-Options=SAMEORIGIN which will block cross-site iframes.
    // We rely on CSP frame-ancestors instead.
    frameguard: false,
    // Allow frontend to embed preview PDFs/images in iframes when needed
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        ...cspDefaults,
        frameAncestors: ["'self'", ...allowedOrigins],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(fileUpload({
  useTempFiles : true,
  tempFileDir : '/tmp/',
}));
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      process.env.FRONTEND_URL1, 
      process.env.FRONTEND_URL2,
      process.env.FRONTEND_URL3,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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
app.use("/api/v1/notes", noteRoutes);

cloudinary.config({ 
  cloud_name: process.env.cloud_name, 
  api_key: process.env.api_key, 
  api_secret: process.env.api_secret 
});

app.listen(port, () => {
  console.log(`Course selling app listening on port ${port}`)
})