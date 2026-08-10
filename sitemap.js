const express = require("express");
const router = express.Router();
const productData = require("./productSchema");

function slugify(name) {
  return (name || "").trim().replace(/\s+/g, "-");
}

function escapeXml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

router.get("/sitemap.xml", async (req, res) => {
  try {
   const products = await productData.find(
  {},
  "_id name updatedAt"
);

    const staticUrls = [
      { loc: "https://adinnoutdoors.com/", priority: "1.0" },
      { loc: "https://adinnoutdoors.com/billboard-advertising-in-india", priority: "0.9" },
    ];

    const productUrls = products.map((p) => ({
      loc: escapeXml(`https://adinnoutdoors.com/Product/${p._id}-${slugify(p.name)}`),
      lastmod: p.updatedAt
        ? new Date(p.updatedAt).toISOString().split("T")[0]
        : undefined,
      priority: "0.7",
    }));

    const allUrls = [...staticUrls, ...productUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    console.error("Sitemap generation error:", err);
    res.status(500).send("Error generating sitemap");
  }
});

module.exports = router;