const express = require("express");


const app = express();
const PORT = process.env.PORT || 3000;

// DAM取得
async function getDamSongs(page, baseUrl) {
  let pageNo = 1;
  let allSongs = [];

  while (true) {
    const url = `${baseUrl}&pageNo=${pageNo}`;
    console.log("DAM:", url);

    await page.goto(url, { waitUntil: "networkidle2" });

    const songs = await page.$$eval(".song-wrap", els =>
      els.map(el => el.textContent.trim())
    );

    if (songs.length === 0) break;

    allSongs = allSongs.concat(songs);
    pageNo++;
  }

  return [...new Set(allSongs)];
}

// JOY取得
async function getJoySongs(page, baseUrl) {
  let pageNo = 1;
  let allSongs = [];
  let prevSongs = [];

  while (true) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    const url = `${baseUrl}${separator}page=${pageNo}`;

    console.log("JOY:", url);

    await page.goto(url, { waitUntil: "networkidle2" });

    await page.waitForSelector(
      "a[href^='/web/search/song/']"
    );

    const songs = await page.$$eval(
      "a[href^='/web/search/song/']",
      els =>
        els
          .map(el => {
            const p = el.querySelector("p");
            return p ? p.textContent.trim() : null;
          })
          .filter(Boolean)
    );

    console.log(`JOY page ${pageNo}: ${songs.length}件`);

    if (songs.join() === prevSongs.join()) {
      break;
    }

    allSongs = allSongs.concat(songs);
    prevSongs = songs;
    pageNo++;
  }

  return [...new Set(allSongs)];
}

// API
app.get("/api/songs", async (req, res) => {
  const puppeteer = await import("puppeteer");

  const damUrl = req.query.dam;
  const joyUrl = req.query.joy;

  console.log("DAM URL:", damUrl);
  console.log("JOY URL:", joyUrl);

  if (!damUrl || !joyUrl) {
    return res.status(400).json({
      error: "DAMとJOYのURLを入力してください"
    });
  }

 const puppeteer = await import("puppeteer");

const browser = await puppeteer.default.launch({
  headless: true,
  executablePath: "/opt/render/.cache/puppeteer/chrome/linux-152.0.7977.42/chrome-linux64/chrome",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox"
  ]
});

  const page = await browser.newPage();

  try {
    const damSongs = await getDamSongs(page, damUrl);
    const joySongs = await getJoySongs(page, joyUrl);

    console.log("DAM曲数:", damSongs.length);
    console.log("JOY曲数:", joySongs.length);

    res.json({
      damSongs,
      joySongs
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "曲情報の取得に失敗しました"
    });
  } finally {
    await browser.close();
  }
});

// public/index.html を公開
app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});