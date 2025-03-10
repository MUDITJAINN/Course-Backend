import { config } from 'dotenv';
import express from 'express';
import { mongoose } from 'mongoose';
import courseRoutes from './routes/course.routes.js';
import fileUpload from 'express-fileupload';

config();
const app = express();

//middleware
app.use(express.json());
app.use(fileUpload({
  useTempFiles : true,
  tempFileDir : '/tmp/'
}));

const port = process.env.PORT || 3000;
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

app.listen(port, () => {
  console.log(`Course selling app listening on port ${port}`)
})