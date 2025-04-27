const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Port
const port = process.env.PORT || 5000;

// MongoDB URI from .env
const uri = process.env.MONGODB_URI;

// MongoClient instance
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Connect to MongoDB once at server startup
async function runMongoConnection() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB!");
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
}

runMongoConnection();

// Get the music collection from MongoDB
const musicCollection = client.db("musicDB").collection("music");
const bookCollection = client.db("bookDB").collection("books");
const blogCollection = client.db("blogDB").collection("blogs");
const categoryCollection = client.db("categoryDB").collection("categories");


// Root endpoint
app.get("/", (req, res) => {
  res.send("🚀 Server is Running....");
});

// Add Music endpoint
app.post("/add-music", async (req, res) => {
  const { title, category, audioUrl, tags, lyrics, meanings } = req.body;

  // Simple validation
  if (!title || !category || !audioUrl || !tags || !lyrics || !meanings) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Create the music object
  const newMusic = {
    title,

    category,
    audioUrl,
    tags, // Tags are expected to be comma separated
    lyrics,
    meanings,
    addedAt: new Date(), // Timestamp of when the music is added
  };

  try {
    const result = await musicCollection.insertOne(newMusic);
    res.status(201).json({
      message: "Music added successfully",
      musicId: result.insertedId,
    });
  } catch (err) {
    console.error("Error adding music:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
// Get all music entries
app.get("/all-music", async (req, res) => {
  try {
    const allMusic = await musicCollection.find().toArray();
    res.status(200).json(allMusic);
  } catch (err) {
    console.error("Error fetching music:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
const { ObjectId } = require("mongodb");

// Delete a music entry
app.delete("/delete-music/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await musicCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res
        .status(200)
        .json({ message: "Music deleted successfully", deletedCount: 1 });
    } else {
      res.status(404).json({ message: "Music not found", deletedCount: 0 });
    }
  } catch (err) {
    console.error("Error deleting music:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Update a music entry
app.put("/update-music/:id", async (req, res) => {
  const id = req.params.id;
  const { title, category, audioUrl, tags, lyrics, meanings } = req.body;

  if (!title || !category || !audioUrl || !tags || !lyrics || !meanings) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const updatedDoc = {
      $set: {
        title,
        category,
        audioUrl,
        tags,
        lyrics,
        meanings,
        updatedAt: new Date(),
      },
    };

    const result = await musicCollection.updateOne(
      { _id: new ObjectId(id) },
      updatedDoc
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: "Music updated successfully" });
    } else {
      res.status(404).json({ message: "Music not found or no changes made" });
    }
  } catch (err) {
    console.error("Error updating music:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
// Add Book endpoint
app.post("/add-book", async (req, res) => {
  const { title, category, link, tags } = req.body;

  if (!title || !category || !link || !tags) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const newBook = {
    title,
    category, // Array of categories
    link,
    tags, // Array of tags
    addedAt: new Date(),
  };

  try {
    const result = await bookCollection.insertOne(newBook);
    res
      .status(201)
      .json({ message: "Book added successfully", bookId: result.insertedId });
  } catch (err) {
    console.error("Error adding book:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get all books
app.get("/all-books", async (req, res) => {
  try {
    const allBooks = await bookCollection.find().toArray();
    res.status(200).json(allBooks);
  } catch (err) {
    console.error("Error fetching books:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete a book
app.delete("/delete-book/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await bookCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res
        .status(200)
        .json({ message: "Book deleted successfully", deletedCount: 1 });
    } else {
      res.status(404).json({ message: "Book not found", deletedCount: 0 });
    }
  } catch (err) {
    console.error("Error deleting book:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Update a book
app.put("/update-book/:id", async (req, res) => {
  const id = req.params.id;
  const { title, category, link, tags } = req.body;

  if (!title || !category || !link || !tags) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const updatedDoc = {
      $set: {
        title,
        category,
        link,
        tags,
        updatedAt: new Date(),
      },
    };

    const result = await bookCollection.updateOne(
      { _id: new ObjectId(id) },
      updatedDoc
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: "Book updated successfully" });
    } else {
      res.status(404).json({ message: "Book not found or no changes made" });
    }
  } catch (err) {
    console.error("Error updating book:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
// Add Blog endpoint
app.post("/add-blog", async (req, res) => {
  const { title, category, blog, tags } = req.body;

  if (!title || !category || !blog|| !tags) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const newBlog = {
    title,
    category, // Array of categories
    blog,
    tags, // Array of tags
    addedAt: new Date(),
  };

  try {
    const result = await blogCollection.insertOne(newBlog);
    res
      .status(201)
      .json({ message: "Blog added successfully", blogId: result.insertedId });
  } catch (err) {
    console.error("Error adding blog:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get all blogs
app.get("/all-blogs", async (req, res) => {
  try {
    const allBlogs = await blogCollection.find().toArray();
    res.status(200).json(allBlogs);
  } catch (err) {
    console.error("Error fetching blogs:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete a blog
app.delete("/delete-blog/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await blogCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 1) {
      res
        .status(200)
        .json({ message: "Blog deleted successfully", deletedCount: 1 });
    } else {
      res.status(404).json({ message: "Blog not found", deletedCount: 0 });
    }
  } catch (err) {
    console.error("Error deleting blog:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Update a blog
app.put("/update-blog/:id", async (req, res) => {
  const id = req.params.id;
  const { title, category, imageUrl, content, tags } = req.body;

  if (!title || !category || !blog || !tags) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const updatedDoc = {
      $set: {
        title,
        category,
        blog,
        tags,
        updatedAt: new Date(),
      },
    };

    const result = await blogCollection.updateOne(
      { _id: new ObjectId(id) },
      updatedDoc
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: "Blog updated successfully" });
    } else {
      res.status(404).json({ message: "Blog not found or no changes made" });
    }
  } catch (err) {
    console.error("Error updating blog:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Post category
app.post("/add-category", async (req, res) => {
  const { section, category } = req.body;

  if (!section || !category) {
    return res.status(400).json({ message: "Section and category are required" });
  }

  const newCategory = {
    section, // music, book, blog
    category,
    addedAt: new Date(),
  };

  try {
    const result = await categoryCollection.insertOne(newCategory);
    res.status(201).json({
      message: "Category added successfully",
      categoryId: result.insertedId,
    });
  } catch (err) {
    console.error("Error adding category:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

//Get category
app.get("/categories/:section", async (req, res) => {
  const section = req.params.section;

  try {
    const categories = await categoryCollection.find({ section }).toArray();
    res.status(200).json(categories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete category 
app.delete("/delete-category/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await categoryCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 1) {
      res.status(200).json({ message: "Category deleted successfully" });
    } else {
      res.status(404).json({ message: "Category not found" });
    }
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// Start server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
