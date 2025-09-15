// downloader.js (yeah men CommonJS)
// Usage:
//   node downloader.js <url> [output_basename]
// OR: set LINK variable below and run: node downloader.js
const got = require('got').default;
const m3u8Parser = require('m3u8-parser');
const { decryptaes, decryptkey } = require('./decrypt');
const fs = require('fs');
const { execSync } = require('child_process');
const cheerio = require('cheerio');   // <-- added for title scraping
const sanitize = require('sanitize-filename'); // <-- added for safe filenames

class SegmentsDownloader {
    constructor(segments, base_url, on_loaded, options = {}) {
        this.segments = segments;
        this.base_url = base_url;
        this.nloadedsegments = 0;
        this.nbitloaded = 0;
        this.on_loaded = on_loaded;
        this.options = options;
        this.response = new Array(segments.length);
    }

    on_segment_loaded(i, bytes) {
        this.nloadedsegments++;
        this.nbitloaded += bytes.byteLength;
        console.log(
            `${this.nloadedsegments} of ${this.segments.length} segments (${Math.round(
                (this.nloadedsegments / this.segments.length) * 100
            )}%)`
        );
        this.response[i] = bytes;
        if (this.nloadedsegments === this.segments.length) {
            console.log(`Download complete: ${Math.round(this.nbitloaded / 1000)}KB`);
            this.on_loaded(this.response);
        }
    }

    async download_segment(i) {
        const key_url = `${this.base_url}/${this.segments[i].key.uri}`;
        const segment_url = `${this.base_url}/${this.segments[i].uri}`;
        const key = await download_key(key_url, this.options);
        const encrypted_ts = await got(segment_url, this.options);
        return decryptaes(
            {
                encrypted: encrypted_ts.rawBody,
                key: key,
                iv: this.segments[i].key.iv,
            },
            this,
            i
        );
    }

    async startdownload() {
        this.timestart = Date.now();
        for (let i = 0; i < this.segments.length; i++) {
            try {
                await this.download_segment(i);
            } catch (err) {
                console.error(`Error downloading segment ${i}:`, err.message);
            }
        }
    }
}

function concat(arrays) {
    const totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
    if (!arrays.length) return null;
    const result = new Uint8Array(totalLength);
    let length = 0;
    for (const array of arrays) {
        result.set(array, length);
        length += array.length;
    }
    return result;
}

async function download_key(url, options = {}) {
    const encrypted_key = await got(url, options);
    return decryptkey(encrypted_key.rawBody);
}

async function download_m3u8(url, outputPath, options = {}) {
    const raw_m3u8 = await got(url, options);
    const base_url = url.split('/').slice(0, -1).join('/');

    const parser = new m3u8Parser.Parser();
    parser.push(raw_m3u8.body);
    parser.end();

    // --- Optional: scrape page title for filename ---
    try {
        const pageRes = await got(url, options);
        const $ = cheerio.load(pageRes.body);
        const title = $('title').text().trim();
        if (title) {
            outputPath = sanitize(title) + '.ts';
            console.log('Using sanitized page title as output filename:', outputPath);
        }
    } catch (e) {
        console.warn('Failed to fetch/sanitize title, using default filename.');
    }

    async function store_file(segmentList) {
        const combined = concat(segmentList);
        fs.writeFileSync(outputPath, Buffer.from(combined));
        console.log('TS file saved:', outputPath);

        // Optional: convert to mp4
        const mp4Path = outputPath.replace(/\.ts$/, '.mp4');
        try {
            execSync(`ffmpeg -y -i "${outputPath}" -c copy "${mp4Path}"`);
            console.log('MP4 file created:', mp4Path);
        } catch (err) {
            console.error('ffmpeg conversion failed:', err.message);
        }
    }

    const downloader = new SegmentsDownloader(parser.manifest.segments, base_url, store_file, options);
    await downloader.startdownload();
}


const m3u8Url = process.argv[2];
if (!m3u8Url) {
    console.error('Usage: node do_download.js <m3u8_url>');
    process.exit(1);
}


const headers = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)',
        Referer: 'https://share.spotlightr.com/',
    },
};

let outputFile = 'myvideo.ts';
download_m3u8(m3u8Url, outputFile, headers).catch((err) =>
    console.error('Error downloading m3u8:', err.message)
);
