// business logic - receives user input, processes it and sends it to the
import { Course } from "../models/course.model.js";
import { v2 as cloudinary } from "cloudinary";
import { Purchase } from "../models/purchase.model.js";
import config from "../config.js";
import {
  getOrderAmount,
  getOrderState,
  getPhonePeAccessToken,
  getPhonePeCheckoutBaseUrl,
  isPhonePeConfigured,
} from "../services/phonepe.service.js";

export const createCourse = async (req, res) => {
  const adminId = req.adminId;
  const { title, description, price } = req.body;
  console.log(title, description, price);

  try {
    if (!title || !description || !price) {
      return res.status(400).json({ errors: "All fields are required" });
    }
    const { image } = req.files;
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ errors: "No file uploaded" });
    }

    const allowedFormat = ["image/png", "image/jpeg"];
    if (!allowedFormat.includes(image.mimetype)) {
      return res
        .status(400)
        .json({ errors: "Invalid file format. Only PNG and JPG are allowed" });
    }

    // claudinary code
    const cloud_response = await cloudinary.uploader.upload(image.tempFilePath);
    if (!cloud_response || cloud_response.error) {
      return res
        .status(400)
        .json({ errors: "Error uploading file to cloudinary" });
    }

    const courseData = {
      title,
      description,
      price,
      image: {
        public_id: cloud_response.public_id,
        url: cloud_response.url,
      },
      creatorId: adminId,
    };
    const course = await Course.create(courseData);
    res.json({
      message: "Course created successfully",
      course,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error creating course" });
  }
};

export const updateCourse = async (req, res) => {
    const adminId = req.adminId;
    const {courseId} = req.params;
    const { title, description, price, image } = req.body;
    try {
        const course = await Course.updateOne(
        {
            _id: courseId,
            creatorId: adminId
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
        res.status(201).json({message: "Course updated successfully",course})
    } catch (error) {
        res.status(500).json({error: "Error in course updating"})
        console.log("Error in course updating ",error)
    }
};

export const deleteCourse = async (req, res) => {
    const adminId = req.adminId;
    const { courseId } = req.params;
    try {
      const course = await Course.findOneAndDelete({
        _id: courseId,
        creatorId: adminId,
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

const hasSuccessfulCoursePurchase = (userId, courseId) =>
  Purchase.findOne({
    userId,
    courseId,
    $nor: [{ status: "PENDING" }, { status: "FAILED" }],
  });

export const createCoursePayment = async (req, res) => {
  const { courseId } = req.params;
  const { userId } = req;

  if (!isPhonePeConfigured()) {
    return res.status(500).json({
      errors:
        "PhonePe is not configured. Set PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET and PHONEPE_CLIENT_VERSION in backend env.",
    });
  }

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ errors: "Course not found" });
    }

    const alreadyPurchased = await hasSuccessfulCoursePurchase(userId, course._id);
    if (alreadyPurchased) {
      return res.status(400).json({ errors: "You already purchased this course" });
    }

    const merchantTransactionId = `COURSE_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    const accessToken = await getPhonePeAccessToken();
    const requestPayload = {
      merchantOrderId: merchantTransactionId,
      amount: course.price * 100,
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: `Payment for ${course.title}`,
        merchantUrls: {
          redirectUrl: `${config.FRONTEND_URL}/buy/${encodeURIComponent(
            courseId
          )}?merchantOrderId=${encodeURIComponent(merchantTransactionId)}`,
        },
      },
    };

    const phonePeResponse = await fetch(`${getPhonePeCheckoutBaseUrl()}/checkout/v2/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `O-Bearer ${accessToken}`,
        accept: "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    const data = await phonePeResponse.json();
    const hasRedirectUrl = Boolean(data?.redirectUrl || data?.data?.redirectUrl);
    const isCreatePaymentSuccess = phonePeResponse.ok && hasRedirectUrl;

    if (!isCreatePaymentSuccess) {
      return res.status(400).json({
        errors: data?.message || "Unable to start payment",
        data,
      });
    }

    await Purchase.create({
      userId,
      courseId: course._id,
      amountInPaise: course.price * 100,
      merchantTransactionId,
      status: "PENDING",
      gatewayResponse: data,
    });

    const paymentUrl = data?.redirectUrl || data?.data?.redirectUrl || null;
    if (!paymentUrl) {
      return res.status(400).json({ errors: "PhonePe payment URL not found" });
    }

    return res.status(200).json({
      message: "Payment initiated",
      paymentUrl,
      merchantTransactionId,
    });
  } catch (error) {
    console.log("Error in createCoursePayment", error);
    return res.status(500).json({ errors: "Error in creating course payment" });
  }
};

export const verifyCoursePayment = async (req, res) => {
  const { courseId, merchantOrderId, transactionId } = req.query;
  const { userId } = req;
  const resolvedOrderId = merchantOrderId || transactionId;

  if (!courseId || !resolvedOrderId) {
    return res.status(400).json({ errors: "courseId and merchantOrderId are required" });
  }

  if (!isPhonePeConfigured()) {
    return res.status(500).json({
      errors:
        "PhonePe is not configured. Set PHONEPE_CLIENT_ID, PHONEPE_CLIENT_SECRET and PHONEPE_CLIENT_VERSION in backend env.",
    });
  }

  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ errors: "Course not found" });
    }

    const existingPayment = await Purchase.findOne({
      userId,
      courseId,
      merchantTransactionId: resolvedOrderId,
    });

    if (!existingPayment) {
      return res.status(404).json({ errors: "Payment transaction not found for this user" });
    }

    const accessToken = await getPhonePeAccessToken();
    const statusCandidates = [
      `${getPhonePeCheckoutBaseUrl()}/checkout/v2/order/${encodeURIComponent(
        resolvedOrderId
      )}/status`,
      `${getPhonePeCheckoutBaseUrl()}/checkout/v2/status/${encodeURIComponent(resolvedOrderId)}`,
    ];
    let statusData = null;
    let statusResponse = null;
    for (const url of statusCandidates) {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `O-Bearer ${accessToken}`,
          accept: "application/json",
        },
      });
      const data = await response.json();
      if (response.ok) {
        statusResponse = response;
        statusData = data;
        break;
      }
      if (!statusData) {
        statusResponse = response;
        statusData = data;
      }
    }

    const paidAmount = getOrderAmount(statusData);
    const paymentState = getOrderState(statusData);
    const isSuccess =
      statusResponse.ok &&
      ["COMPLETED", "SUCCESS", "PAID"].includes(paymentState) &&
      paidAmount === course.price * 100;

    existingPayment.gatewayResponse = statusData;
    existingPayment.status = isSuccess ? "SUCCESS" : "FAILED";
    await existingPayment.save();

    if (!isSuccess) {
      return res.status(400).json({
        errors: "Payment not completed or amount mismatch",
        paymentState: paymentState || "UNKNOWN",
      });
    }

    return res.status(200).json({
      message: "Payment verified. Course unlocked.",
      courseId,
      unlocked: true,
    });
  } catch (error) {
    console.log("Error in verifyCoursePayment", error);
    return res.status(500).json({ errors: "Error in payment verification" });
  }
};