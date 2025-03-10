// business logic - receives user input, processes it and sends it to the 

import {Course} from '../models/course.model.js'

export const createCourse = async (req,res)=>{
    
    const {title,description,price,image} = req.body;  // request from the client/frontend destructured
    console.log(req.body);

   try{
    if(!title || !description || !price || !image){
        return res.status(400).json({          // 400 - bad request
            errors : "All fields are required"
        });
    }

    const courseData = {
        title,
        description,
        price,
        image
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