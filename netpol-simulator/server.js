
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(express.json());

// Serve files from the public folder if it exists;
// otherwise serve files from the project root.
const publicDir = fs.existsSync(path.join(__dirname, "public"))
  ? path.join(__dirname, "public")
  : __dirname;

app.use(express.static(publicDir));

// Serve the homepage
app.get("/", (req, res) => {
  const indexPath = path.join(publicDir, "index.html");

  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  res.status(404).send("index.html not found");
});

// Check whether traffic is allowed by the policies
function isAllowed(policies, src, dst) {
  const { denyAll, fb, bd } = policies;

  const selected =
    denyAll ||
    (dst === "backend" && fb) ||
    (dst === "database" && bd);

  if (!selected) return true;

  if (dst === "backend" && fb && src === "frontend") {
    return true;
  }

  if (dst === "database" && bd && src === "backend") {
    return true;
  }

  return false;
}

// Test one source-to-destination connection
app.post("/api/test", (req, res) => {
  const { policies, src, dst } = req.body;

  if (!policies || !src || !dst) {
    return res.status(400).json({
      error: "policies, src and dst are required"
    });
  }

  res.json({
    src,
    dst,
    allowed: isAllowed(policies, src, dst)
  });
});

// Test all configured connection pairs
app.post("/api/test-all", (req, res) => {
  const { policies } = req.body;

  if (!policies) {
    return res.status(400).json({
      error: "policies required"
    });
  }

  const pairs = [
    ["frontend", "backend"],
    ["frontend", "database"],
    ["backend", "database"],
    ["test-client", "backend"],
    ["test-client", "database"]
  ];

  const results = pairs.map(([src, dst]) => ({
    src,
    dst,
    allowed: isAllowed(policies, src, dst)
  }));

  res.json(results);
});

// Start the server locally
if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Running at http://localhost:${PORT}`);
  });
}

// Export the app for deployment environments
module.exports = app;
