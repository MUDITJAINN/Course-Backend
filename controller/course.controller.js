// business logic - receives user input, processes it and sends it to the 
import {Course} from '../models/course.model.js'
import { v2 as cloudinary } from 'cloudinary';
import { Purchase } from '../models/purchase.model.js';

export const createCourse = async (req,res)=>{
    const {title,description,price} = req.body;  // request from the client/frontend destructured
    console.log(req.body);

   try{
    if(!title || !description || !price){
        return res.status(400).json({         // 400 - bad request
            errors : "All fields are required"
        });
    }
    
    const {image} = req.files;

    if(!req.files || Object.keys(req.files).length === 0){
        return res.status(400).json({          // 400 - bad request
            errors : "Image is required"
        });
    }  

    const allowedFormat=["image/png", "image/jpeg", "image/jpg"]
    if(!allowedFormat.includes(image.mimetype)){
        return res.status(400).json({ 
            errors : "Image format not supported"
        });
    }
    
    const cloud_response= await cloudinary.uploader.upload(image.tempFilePath);
    if(!cloud_response || cloud_response.error) {
        return res.status(400).json({ errors: "Error uploading file to cloudinary" });
    }

    const courseData = {
    title,
    description,
    price,
    image: {
        public_id: cloud_response.public_id,
        url: cloud_response.secure_url,
    },
    };

    const course = await Course.create(courseData);
    
    res.json({
        message:"Course created successfully",     // response to data created in database
        course
    });
   } 
   
   catch(error){
    console.log(error);  
    res.status(500).json({               
        message:"Internal server error"
    });
 }
}

export const updateCourse = async (req, res) => {
    const {courseId} = req.params;
    const { title, description, price, image } = req.body;
    try {
        const course = await Course.updateOne(
        {
            _id: courseId
        },
        {
            title,
            description,
            price,
            image: {
                public_id: image?.public_id, 
                url: image?.url 
            }
        })
        res.status(201).json({message: "Course updated successfully"})
    } catch (error) {
        res.status(500).json({error: "Error in course updating"})
        console.log("Error in course updating ",error)
    }
};

export const deleteCourse = async (req, res) => {
    const { courseId } = req.params;
    try {
      const course = await Course.findOneAndDelete({
        _id: courseId,
      });
      if (!course) {
        return res.status(404).json({ errors: "course not found" });
      }
      res.status(200).json({ message: "Course deleted successfully" });
    } catch (error) {
      res.status(500).json({ errors: "Error in course deleting" });
      console.log("Error in course deleting", error);
    }
  };    

export const getCourses = async (req, res) => {
    try {
      const courses = await Course.find({});
      res.status(201).json({ courses });
    } catch (error) {
      res.status(500).json({ errors: "Error in getting courses" });
      console.log("error to get courses", error);
    }
};

export const courseDetails = async (req, res) => {
    const { courseId } = req.params;
    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }
      res.status(200).json({ course });
    } catch (error) {
      res.status(500).json({ errors: "Error in getting course details" });
      console.log("Error in course details", error);
    }
  };

  export const buyCourses = async (req, res) => {
    const { userId } = req;
    const { courseId } = req.params;
  
    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ errors: "Course not found" });
      }
      const existingPurchase = await Purchase.findOne({ userId, courseId });
      if (existingPurchase) {
        return res
          .status(400)
          .json({ errors: "User has already purchased this course" });
      }
  
      const newPurchase = new Purchase({ userId, courseId });
      await newPurchase.save();

      res.status(201).json({
        message: "Course purchased successfully",
        newPurchase,
      });
    } catch (error) {
      res.status(500).json({ errors: "Error in course buying" });
      console.log("error in course buying ", error);
    }
  };  