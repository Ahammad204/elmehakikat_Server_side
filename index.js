const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

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
const userCollection = client.db("userDB").collection("user");

//Own MiddleWare
//Verify Token

const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "Forbidden Access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
};
// use verify admin after verifyToken
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === "admin";
  if (!isAdmin) {
    return res.status(403).send({ message: "forbidden access" });
  }
  next();
};
//Get admin
app.get("/users/admin/:email", verifyToken, async (req, res) => {
  const email = req.params.email;

  if (email !== req.decoded.email) {
    return res.status(403).send({ message: "forbidden access" });
  }

  const query = { email: email };
  const user = await userCollection.findOne(query);
  let admin = false;
  if (user) {
    admin = user?.role === "admin";
  }
  res.send({ admin });
});

//Make Admin
app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };

    // Fetch the current document to check the current status
    const currentDoc = await userCollection.findOne(filter);

    if (!currentDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    // Determine the new status based on the current status
    const newRole = currentDoc.role === "member" ? "admin" : "member";

    const updatedDoc = {
      $set: {
        role: newRole,
      },
    };

    const result = await userCollection.updateOne(filter, updatedDoc);

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
  // Get User Data 
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            try {
                // const userEmail = req.query.email;
                const result = await userCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error(error);
                res.status(500).send('Internal Server Error');
            }
        });

// REGISTER
app.post("/api/register", async (req, res) => {
  const { name, email, password, photo, role } = req.body;

  try {
    const existingUser = await userCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { name, email, password: hashedPassword, photo, role };

    const result = await userCollection.insertOne(newUser);

    const token = jwt.sign(
      { id: result.insertedId, email },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      message: "User registered successfully",
      userId: result.insertedId,
      token,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await userCollection.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    // ✅ Include full user info in the token
    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photo: user.photo,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      message: "Login successful",
      token,
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Update profile
app.put("/api/update-profile", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, photo } = req.body;

    const result = await userCollection.updateOne(
      { _id: new ObjectId(decoded.id) },
      { $set: { name, photo } }
    );

    res.json({ message: "Profile updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

// Get user data
app.get("/api/user", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract the token from the Authorization header
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from the database using the user ID from the decoded token
    const user = await userCollection.findOne({
      _id: new ObjectId(decoded.id),
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    // Send the user data back in the response
    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching user data" });
  }
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

  if (!title || !category || !blog || !tags) {
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
    return res
      .status(400)
      .json({ message: "Section and category are required" });
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
    const result = await categoryCollection.deleteOne({
      _id: new ObjectId(id),
    });

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
