require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Successfully connected to MongoDB Atlas for API!"))
  .catch((err) => console.error("Connection error:", err));

// 2. Define Product Schema & Model
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

// --- API ROUTES ---

// 1. GET: Fetch all products with category filtering and price sorting support
app.get("/api/products", async (req, res) => {
  try {
    const { category, sort } = req.query;
    let query = {};

    // Filter by category if provided and not 'All'
    if (category && category !== "All") {
      query.category = { $regex: category, $options: "i" };
    }

    let dbQuery = Product.find(query);

    // Sort by price if requested
    if (sort === "low-high") {
      dbQuery = dbQuery.sort({ "pricing.base_price": 1 });
    } else if (sort === "high-low") {
      dbQuery = dbQuery.sort({ "pricing.base_price": -1 });
    }

    const products = await dbQuery;
    const total = await Product.countDocuments(query);

    res.json({
      totalProducts: total,
      products,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET: Search products by keyword (leveraging our Text Index)
app.get("/api/products/search", async (req, res) => {
  try {
    const keyword = req.query.q;
    const results = await Product.find({ $text: { $search: keyword } });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. POST: Add a new product to the catalog (used by frontend modal form)
app.post("/api/products", async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    const savedProduct = await newProduct.save();
    res
      .status(201)
      .json({ message: "Product added successfully!", savedProduct });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 4. GET: Analytics Report Route (Aggregation Pipeline)
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
    res.status(500).json({ error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running live on port ${PORT}`);
});
