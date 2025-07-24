const mongoose = require('mongoose');

mongoose.set('strictQuery', false);

mongoose.connect("mongodb+srv://ba:sLAqxQMpCCjI2Gtf@adinnoutdoors.zpylrw9.mongodb.net/adinnoutdoors?retryWrites=true&w=majority&appName=adinnoutdoors", {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB connected successfully"))
.catch((err) => console.error("❌ Connection failed:", err));
