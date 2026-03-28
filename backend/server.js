import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// Login API
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "admin@gmail.com" && password === "123456") {
    return res.json({
      success: true,
      user: {
        name: "Aditya",
        email: "admin@gmail.com"
      }
    });
  }

  res.status(401).json({ success: false, message: "Invalid credentials" });
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});