import express from 'express';
import  dotenv  from 'dotenv';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import courseRoutes from './routes/course.routes.js';
import userRoutes from "./routes/user.routes.js";
import adminRoute from "./routes/admin.route.js";
import noteRoutes from "./routes/note.routes.js";
import { mountChatbot } from "./ai-chatbot/index.js";
import { Course } from "./models/course.model.js";
import { Note } from "./models/note.model.js";
import fileUpload from 'express-fileupload';
import cookieParser from 'cookie-parser';
import cors from "cors";
import compression from "compression";
import helmet from "helmet";

const app = express();
dotenv.config();
//middleware
app.disable("x-powered-by");

const normalizeOriginForCsp = (url) => {
  const cleaned = String(url || "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/[;,]+$/g, "");
  if (!cleaned) return null;
  try {
    return new URL(cleaned).origin;
  } catch {
    return cleaned.replace(/\/+$/, "");
  }
};

const frameAncestorOrigins = [
  ...new Set(
    [
      process.env.FRONTEND_URL1,
      process.env.FRONTEND_URL2,
      process.env.FRONTEND_URL3,
      process.env.FRONTEND_URL4,
    ]
      .map(normalizeOriginForCsp)
      .filter(Boolean)
  ),
];

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
        frameAncestors: ["'self'", ...frameAncestorOrigins],
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
      process.env.FRONTEND_URL1, 
      process.env.FRONTEND_URL2,
      process.env.FRONTEND_URL3,
      process.env.FRONTEND_URL4,
      process.env.BACKEND_URL,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

// AI chatbot — copy the `ai-chatbot` folder to reuse in other Express apps
mountChatbot(app, {
  siteName: "Programming With Mudit",
  fetchCourses: async () =>
    Course.find({})
      .select("title description price")
      .sort({ _id: -1 })
      .limit(40)
      .lean(),
  fetchNotes: async () =>
    Note.find({ isPublished: true })
      .select("title description price pages")
      .sort({ createdAt: -1 })
      .limit(40)
      .lean(),
});

cloudinary.config({ 
  cloud_name: process.env.cloud_name, 
  api_key: process.env.api_key, 
  api_secret: process.env.api_secret 
});

app.listen(port, () => {
  console.log(`Course selling app listening on port ${port}`)
})