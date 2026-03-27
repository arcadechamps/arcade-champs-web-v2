import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
// @ts-ignore - dotenv is a dev/script dependency
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase credentials in environment.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BASE_URL = "https://play.arcadechamps.com";

async function generateSitemap() {
  console.log("Generating sitemap...");

  const staticRoutes = [
    "/",
    "/about",
    "/games",
    "/contest",
    "/login",
    "/signup",
    "/terms",
    "/privacy",
  ];

  const sitemapRows: string[] = [];

  // Add static routes
  staticRoutes.forEach((route) => {
    sitemapRows.push(`  <url>\n    <loc>${BASE_URL}${route}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${route === "/" ? "1.0" : "0.8"}</priority>\n  </url>`);
  });

  // Fetch active games and contests from Supabase
  const [gamesRes, contestsRes, contestGamesRes] = await Promise.all([
    supabase.from("games").select("slug").eq("is_active", true),
    supabase.from("contests").select("id, slug").in("status", ["active", "upcoming"]),
    supabase.from("contest_games").select("contest_id, game_id, games(slug)").eq("is_active", true),
  ]);

  if (gamesRes.data) {
    gamesRes.data.forEach((game) => {
      sitemapRows.push(`  <url>\n    <loc>${BASE_URL}/free-play/${game.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`);
    });
  }

  if (contestsRes.data && contestGamesRes.data) {
    const activeContests = contestsRes.data;
    const cgData = contestGamesRes.data as any[];

    activeContests.forEach((contest) => {
      const contestGames = cgData.filter(cg => cg.contest_id === contest.id);
      
      contestGames.forEach((cg) => {
        if (cg.games && cg.games.slug) {
          sitemapRows.push(`  <url>\n    <loc>${BASE_URL}/contest-play/${contest.slug}/${cg.games.slug}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`);
        }
      });
    });
  }

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRows.join("\n")}\n</urlset>`;

  // Write to public folder
  const outputPath = path.resolve(process.cwd(), "public", "sitemap.xml");
  fs.writeFileSync(outputPath, sitemapXml, "utf-8");

  console.log(`✅ Sitemap successfully generated at ${outputPath}`);
}

generateSitemap().catch(console.error);
