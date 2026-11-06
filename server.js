require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// 1. Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Successfully connected to MongoDB Atlas!"))
  .catch((err) => console.error("Connection error:", err));

// 2. Define Product Mongoose Schema & Model
const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  brand: { type: String, index: true },
  pricing: {
    base_price: Number,
    currency: String,
    discount: Number,
  },
  attributes: { type: Map, of: String },
  inventory: { type: Map, of: Number },
  ratings: {
    average: Number,
    count: Number,
  },
  tags: [String],
  created_at: { type: Date, default: Date.now },
});

const Product = mongoose.model("Product", productSchema);

// 3. API Routes for your Frontend to call
// Get all products / Search / Filter
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().limit(50);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Analytics Route (Runs your aggregation pipeline on-demand)
app.get("/api/analytics/categories", async (req, res) => {
  try {
    const analytics = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          totalProducts: { $sum: 1 },
          averagePrice: { $avg: "$pricing.base_price" },
          maxPrice: { $max: "$pricing.base_price" },
        },
      },
      { $sort: { totalProducts: -1 } },
    ]);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate analytics" });
  }
});

// 4. Start Server with Dynamic Port Binding (Crucial for Deployment)
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
