require("dotenv").config();
const dns = require("dns");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ Connecté à MongoDB");
  })
  .catch((error) => {
    console.error("❌ Erreur de connexion à MongoDB:", error);
  });

// Define a schema for the URL
const urlSchema = mongoose.Schema({
  original_url: {
    type: String,
    required: true,
    unique: true,
  },
  short_url: {
    type: Number,
    required: true,
    unique: true,
  },
});

// Create a model for the URL
const Url = mongoose.model("Url", urlSchema);

app.use(cors());

app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json()); // Parse JSON bodies (as sent by API clients)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.post("/api/shorturl", function (req, res) {
  const original_url = req.body.url;
  console.log(original_url);
  const hostname = new URL(original_url).hostname;
  // Check if the hostname is valid
  dns.lookup(hostname, (error) => {
    if (error) {
      return res.json({ error: "invalid url" });
    }

    // Check if already exists in database
    Url.findOne({ original_url: original_url }).then((foundUrl) => {
      if (foundUrl) {
        return res.json({
          original_url: foundUrl.original_url,
          short_url: foundUrl.short_url,
        });
      } else {
        let url = {
          original_url: original_url,
          short_url: Math.floor(Math.random() * 100000),
        };
        // Save the new url to the database
        new Url(url)
          .save()
          .then((savedUrl) => {
            return res.json({
              original_url: savedUrl.original_url,
              short_url: savedUrl.short_url,
            });
          })
          .catch((error) => {
            console.error("Error saving URL: ", error);
          });
      }
    });
  });
});

// Your first API endpoint
app.get("/api/shorturl/:short_url", function (req, res) {
  const short_url = req.params.short_url;

  // Find the URL in the database and redirect
  Url.findOne({ short_url: short_url })
    .then((foundUrl) => {
      if (foundUrl) {
        return res.redirect(foundUrl.original_url);
      } else {
        return res.json({ error: "No short URL found for the given input" });
      }
    })
    .catch((error) => {
      return console.error("Error finding URL: ", error);
    });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
