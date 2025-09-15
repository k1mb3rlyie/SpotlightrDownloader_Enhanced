// Omoniyi I did this for you and your family friends 
// downloader.js (yeah men CommonJS)
// Usage:
//   node downloader.js <url> [output_basename]
// OR: set LINK variable below and run: node downloader.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // npm install node-fetch@2
const cheerio = require('cheerio');   // <-- added for title scraping
const sanitize = require('sanitize-filename'); // <-- added for safe filenames

// ------------- optionally you could hardcode a video link here -------------
let LINK = ''; // <-- set your link here OR pass as CLI arguement
// -----------------------------------------------------------

const argvUrl = process.argv[2];
const outBaseArg = process.argv[3] || 'spotlightr_output';
const URL = argvUrl || LINK;
const OUT_BASE = outBaseArg;

if (!URL) {
  console.error('Usage: node downloader.js <url> [output_basename]');
  console.error('Or set LINK variable inside the script and run without args.');
  process.exit(1);
}

function runCommand(cmd) {
  try {
    console.log('> ' + cmd);
    execSync(cmd, { stdio: 'inherit' });
    return true;
  } catch (err) {
    console.error('Command failed:', err.message || err);
    return false;
  }
}

async function detectAndHandle(url, outBase) {
  try {
    console.log('Checking URL:', url);

        if (!outBase || outBase === 'spotlightr_output') {
            console.log('Fetching page to scrape title...');
            try {
                const pageRes = await fetch(url);
                if (pageRes.ok) {
                    const html = await pageRes.text();
                    const $ = cheerio.load(html);
                    let title = $('title').text().trim() || 'spotlightr_output';
                    outBase = sanitize(title); // make it safe for filenames
                    console.log('Using sanitized page title as output base:', outBase);
                }
            } catch (e) {
                console.warn('Failed to fetch/sanitize title, using default output base.', e.message);
                outBase = 'spotlightr_output';
            }
        }
    const clean = url.split('?')[0].toLowerCase();
    if (clean.endsWith('.mp4')) {
      console.log('Detected direct MP4 link — downloading via curl...');
      const outFile = `${outBase}.mp4`;
      if (runCommand(`curl -L "${url}" -o "${outFile}"`)) {
        console.log('Saved to', outFile);
      }
      return;
    }

    // Try HEAD for content-type (some servers don't accept HEAD)
    let contentType = '';
    try {
      const head = await fetch(url, { method: 'HEAD' });
      contentType = head.headers.get('content-type') || '';
    } catch (e) {
      // ignore HEAD errors; fallback to GET
    }


    if (clean.endsWith('.m3u8') || contentType.includes('mpegurl') || contentType.includes('vnd.apple.mpegurl')) {
      console.log('Detected HLS playlist. Fetching playlist to scan for DRM markers...');
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Failed to fetch playlist: ' + resp.status);
      const playlistText = await resp.text();

      // Being a pirate is bad DRM detection: regex checks (Arrghh...!)
      const drmRegexes = [
        /EXT-X-KEY:[^\n]*METHOD=(SAMPLE-AES|SAMPLE-AES-CTR|AES-128)/i,
        /URI="skd:/i,
        /KEYFORMAT=/i,
        /pssh/i,
        /KID/i
      ];
      const drmFound = drmRegexes.some(rx => rx.test(playlistText));

      if (drmFound) {
        console.error('\n🔐 DRM/Encryption markers detected in the playlist. Aborting — this stream appears protected.');
        console.error('If you own the content, download from your Spotlightr dashboard or contact the owner/support.');
        process.exit(2);
      }

      console.log('No obvious DRM markers found. Proceeding to download HLS via ffmpeg (will join segments).');

      // if ffmpeg exists
      try {
        execSync('ffmpeg -version', { stdio: 'ignore' });
      } catch (e) {
        console.error('ffmpeg not found. Install it (e.g., sudo apt install ffmpeg) and try again.');
        process.exit(3);
      }

      const mp4Out = `${outBase}.mp4`;

      const ffCmd = `ffmpeg -y -hide_banner -loglevel info -i "${url}" -c copy "${mp4Out}"`;
      const ok = runCommand(ffCmd);
      if (!ok) {
        console.error('ffmpeg download failed. You may have a partial or encrypted output. Check the playlist manually.');
        process.exit(4);
      }
      console.log('Download + mux completed:', mp4Out);
      return;
    }


    console.log('URL is obviously not mp4 or m3u8. Attempting GET and saving response.');
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP error: ' + res.status);

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    let ext = '.bin';
    if (ct.includes('mpegurl') || ct.includes('vnd.apple.mpegurl')) ext = '.m3u8';
    else if (ct.includes('mp4') || ct.includes('video')) ext = '.mp4';

    const outFile = `${outBase}${ext}`;
    const dest = fs.createWriteStream(outFile);
    await new Promise((resolve, reject) => {
      res.body.pipe(dest);
      res.body.on('error', reject);
      dest.on('finish', resolve);
    });

    console.log('Saved response to', outFile);
    if (ext === '.m3u8') {
      console.log('It looks like the saved file is an m3u8 playlist. Re-run script with that URL to download via ffmpeg, do the right thing, guy.');
    }
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(9);
  }
}

detectAndHandle(URL, OUT_BASE);
