# SpotlightrDownloader\_Enhanced

**Forked from:** [TomBeranget/SpotlightrDownloader](https://github.com/TomBeranget/SpotlightrDownloader)

Author:@k1mb3rlyie (AI-aided)

**Status:** Enhanced

---

## Overview

SpotlightrDownloader\_Enhanced is a Node.js script for downloading **Spotlightr-hosted videos** (including encrypted HLS streams). It is built on top of the original SpotlightrDownloader, with the following **enhancements**:

* Scrapes the **video page title** automatically.
* Sanitizes the title to create a **safe output filename**.
* Fully supports **AES-encrypted HLS segments**, decrypts them locally, and merges them into a single TS file.
* Optional automatic conversion from TS → MP4 via **ffmpeg**.
* Preserves all original features, including segment download progress, decryption, and concatenation.

> This script is intended for **educational or content ownership purposes only**. Respect copyright and DRM laws. Even though I know some won't

---

## Features

* Download direct MP4 URLs or HLS `.m3u8` streams.
* Handle **encrypted HLS** streams (AES-128, SAMPLE-AES).
* Automatically fetch the page `<title>` and use it as a filename.
* Progress logging for each segment downloaded.
* Optional `.ts` → `.mp4` conversion using ffmpeg.
* Simple CLI usage with fallback defaults.

---

## Requirements
**Clone The Repo  

``` bash
git clone https://github.com/k1mb3rlyie/SpotlightrDownloader_Enhanced.git
cd SpotlightrDownloader_Enhanced
```

* **Node.js v18+**
* npm packages:

  ```bash
  npm install got m3u8-parser cheerio sanitize-filename
  ```
* **ffmpeg** (optional, for MP4 conversion)

  ```bash
  sudo apt install ffmpeg   # Linux
  brew install ffmpeg       # macOS
  ```

---

## Usage

```bash
node do_download.js <m3u8_url>
```

* `<m3u8_url>` – The URL of the Spotlightr HLS playlist (`.m3u8`)
* The script will fetch the page title, sanitize it, and save the TS file as `sanitized-title.ts` by default.
* After the TS file is complete, it will automatically create an MP4 file `sanitized-title.mp4` if ffmpeg is available.

**Example:**

```bash
node do_download.js https://s3-spotlightr-output.b-cdn.net/12345/abcde-720-e.m3u8
```

Output:

```
Using sanitized page title as output filename: My_Cool_Video.ts (maybe)
0 of 10 segments (0%)
...
Download complete: 5000KB
TS file saved: My_Cool_Video.ts
MP4 file created: My_Cool_Video.mp4
```

---

## File Structure

```
SpotlightrDownloader_Enhanced/
├─ do_download.js         # Main script for downloading & decrypting videos
├─ decrypt.js             # AES decryption helper functions
├─ package.json
├─ README.md
└─ ...                    # Other helper files or modules from original repo
```

---

## Notes

* The script **does not bypass DRM**. Encrypted content will fail if the decryption keys are not accessible.
* Progress is logged to the console; you can redirect output if needed:

  ```bash
  node do_download.js <m3u8_url> > download.log
  ```
* Works best with **Node 18+**; `got` is used for HTTP requests.

---

## License

Inherited from the original repo: check [TomBeranget/SpotlightrDownloader](https://github.com/TomBeranget/SpotlightrDownloader) for license details.
