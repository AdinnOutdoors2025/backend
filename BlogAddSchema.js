const mongoose = require('mongoose');
const blogSchema = new mongoose.Schema(
    {
        blogImage: String,
        blogTitle: String,
        authorImage:String,
        blogImagePublicId:String,
        authorName:String,
        authorBlogTitle:String,
        authorPublishDate:String,
        blogSampleContent:String,
        richTextContent : String
    }
)  
const Blog = mongoose.model('Blog', blogSchema);
module.exports = Blog;
