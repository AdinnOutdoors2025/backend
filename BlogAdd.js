const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const router = express.Router();
const blog = require('./BlogAddSchema');
const cors = require('cors');
const bodyParser = require('body-parser');//sent the json data
const fs = require('fs');
//Middlewares
router.use(cors());
router.use(bodyParser.json());
router.use("/images", express.static(path.join(__dirname, "../first-app/public/images")));
router.use(express.static('public'));

const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { v2: cloudinary } = require('cloudinary');
cloudinary.config({
  cloud_name: 'adinn-outdoors',
  api_key: '288959228422799',
  api_secret: 'hNd1fd5iPmj20YRxnrRFFAVEtiw',
});
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'uploadBlogs',
    allowed_formats: ['jpg', 'jpeg', 'png'],
  },
});

const upload = multer({ storage });

router.post('/uploadBlog', upload.single('file'), (req, res) => {
  try {
    res.status(200).json({
      message: 'Upload successful',
      imageUrl: req.file.path,       // ✅ Cloudinary secure URL
      public_id: req.file.public_id, // ✅ Correct ID for future delete, etc.
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

//CREATE BLOG
router.post("/createBlog", async (req, res) => {
  try {
    const newBlog = new blog(req.body);
    const savedBlog = await newBlog.save();
    res.json(savedBlog);
    // res.status(201).json(newBlog);
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ err: " Failed to create blog" });
  }
})
//GET ALL BLOGS
router.get("/getBlog", async (req, res) => {
  try {
    const blogs = await blog.find();
    res.json(blogs);
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ err: "Failed to fetch blogs" })
  }
})


//GET BLOGS BY ID
router.get("/getBlog/:id", async (req, res) => {
  try {
    const blogId = req.params.id;
    const blog1 = await blog.findById(blogId);
    if (!blog1) return res.status(404).json({
      err: "Blog not found"
    });
    res.json(blog1);
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ err: "Failed to fetch blog" })
  }
})


// Update Blog
router.put("/updateBlog/:id", async (req, res) => {
  try {
    const updatedBlog = await blog.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedBlog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    res.status(200).json(updatedBlog); // Changed from delete message to return the updated blog
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ err: "Failed to Update Blog" });
  }
})


//DELETE BLOG
router.delete("/deleteBlog/:id", async (req, res) => {
  try {
    const deletedBlog = await blog.findByIdAndDelete(req.params.id);
    if (!deletedBlog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    res.json(deletedBlog);


  }
  catch (err) {
    console.log(err);
    res.status(500).json({ err: "Failed to delete blog" });
  }
})


module.exports = router;


