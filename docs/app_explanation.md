# Backend Server Documentation (app.py)

This document provides a detailed breakdown of the Flask backend codebase located in [app.py](file:///Users/tomhr/AG_Workspaces/5dgi/agy-cli-projects/bq-release-notes/app.py).

---

## 1. Code Overview & Architecture

The backend operates as a lightweight Python Flask service. Its responsibility is to securely proxy requests, fetch Google Cloud's RSS/Atom XML feed, split daily logs into individual updates, and cache the parsed results.

---

## 2. Component Breakdown

### A. Imports & Configurations
```python
import re
import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template, request
```
- **`re`**: Used for locating the `<h3>` HTML tag boundaries within daily update content blocks.
- **`xml.etree.ElementTree`**: Python's standard XML parsing library, used to traverse the feed nodes.
- **`requests`**: Used to fetch the XML payload via HTTP with configured timeouts and conditional caching headers.
- **`Flask`**: Configured to serve HTML templates and JSON API endpoints.

---

### B. In-Memory Caching Strategy
```python
_feed_cache = {
    "data": None,
    "etag": None,
    "last_modified": None
}
```
A memory cache cache stores three values to optimize API execution:
1. **`data`**: An array of pre-parsed release note JSON objects.
2. **`etag`**: HTTP header tag denoting the payload checksum from Google.
3. **`last_modified`**: Date header denoting when the feed XML was last updated.

---

### C. XML RSS Feed Parsing Logic
#### Function: [`parse_xml_feed(xml_content)`](file:///Users/tomhr/AG_Workspaces/5dgi/agy-cli-projects/bq-release-notes/app.py#L17)
Converts raw XML strings into clean lists of granular, categorized updates.

```python
namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
entries = root.findall('atom:entry', namespaces)
```
1. **Metadata Parsing**: Finds `<entry>` elements under the Atom namespace and extracts properties such as date (`title`), updated timestamps, link URLs, and HTML payloads.
2. **Tag Splitting**:
   ```python
   h3_matches = list(re.finditer(r'<h3>(.*?)</h3>', html_content))
   ```
   If an entry contains header tags (`<h3>Feature</h3>`, `<h3>Change</h3>`), the content is split at the boundary indices.
3. **Array Packaging**: Packaging returns an array of individual items containing:
   * **`id`**: Unique string combining the entry tag, category type, and loop index.
   * **`date`**: Chronological date string.
   * **`type`**: Classification category (Feature, Change, Deprecation, General).
   * **`link`**: Source document URL with category anchor targets.
   * **`content`**: Inner HTML content representing that specific update segment.

---

### D. Routing Endpoints
#### 1. Page Entrypoint
```python
@app.route('/')
def index():
    return render_template('index.html')
```
Loads the browser viewport by serving the [templates/index.html](file:///Users/tomhr/AG_Workspaces/5dgi/agy-cli-projects/bq-release-notes/templates/index.html) file.

#### 2. Release Notes API Endpoint
#### Function: [`get_updates()`](file:///Users/tomhr/AG_Workspaces/5dgi/agy-cli-projects/bq-release-notes/app.py#L93) (`GET /api/updates`)
Serves updates in JSON format. Supports force-refresh bypass (`?refresh=true`).

* **Client Cache Verification**:
  If the request parameter `refresh` is not `true` and cache data exists, it returns immediately without running external network calls.
* **Conditional HTTP Headers**:
  If cache values exist, Flask calls Google with HTTP validation headers:
  ```python
  headers["If-None-Match"] = _feed_cache["etag"]
  headers["If-Modified-Since"] = _feed_cache["last_modified"]
  ```
* **Status Checking**:
  * **`304 Not Modified`**: The server notifies us that the feed has not changed. It immediately streams the existing cache, saving bandwidth.
  * **`200 OK`**: Fresh feed data is downloaded, parsed, updated in memory, and delivered to the client.
  * **Error Handling**: Network exceptions or HTTP failures fall back to cached data (if available) with warning banners, or return clean JSON errors to avoid client script failures.

---

## 3. Execution Diagram

```text
       Client Request
             │
             ▼
     ┌───────────────┐
     │  GET /api     │
     │   /updates    │
     └───────┬───────┘
             │
      Is refresh=true
      or cache empty?
      ├─── No ───────────────────► [ Serve Cache JSON ]
      │                                   ▲
     Yes                                  │
      │                             Status = 304?
      ▼                                   │
┌────────────┐                      ┌─────┴─────┐
│ Fetch Feed ├─────────────────────►│  Inspect  │
│ with Cache │                      │  Status   │
│  Headers   │                      └─────┬─────┘
└────────────┘                            │
                                     Status = 200?
                                          │
                                          ▼
                                   ┌─────────────┐
                                   │ Parse XML & │
                                   │ Update Cache│
                                   └──────┬──────┘
                                          │
                                          ▼
                                   [ Serve JSON ]
```
