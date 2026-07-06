import re
import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to prevent excessive requests to Google
_feed_cache = {
    "data": None,
    "etag": None,
    "last_modified": None
}

def parse_xml_feed(xml_content):
    """
    Parses the BigQuery release notes Atom feed and splits entries into individual updates.
    """
    try:
        root = ET.fromstring(xml_content)
    except Exception as e:
        print(f"XML Parsing Error: {e}")
        return []

    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = root.findall('atom:entry', namespaces)
    
    parsed_updates = []
    
    for entry_idx, entry in enumerate(entries):
        # Extract metadata
        date_title = entry.find('atom:title', namespaces)
        date_str = date_title.text.strip() if date_title is not None else "Unknown Date"
        
        updated_elem = entry.find('atom:updated', namespaces)
        updated_str = updated_elem.text.strip() if updated_elem is not None else ""
        
        id_elem = entry.find('atom:id', namespaces)
        entry_id = id_elem.text.strip() if id_elem is not None else f"entry-{entry_idx}"
        
        link_elem = entry.find('atom:link[@rel="alternate"]', namespaces)
        alternate_link = link_elem.attrib.get('href', '') if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', namespaces)
        if content_elem is None:
            continue
            
        html_content = content_elem.text if content_elem.text else ""
        
        # Split HTML content by <h3> headers to get individual updates
        h3_matches = list(re.finditer(r'<h3>(.*?)</h3>', html_content))
        
        if not h3_matches:
            # If no <h3> tags found, treat the entire entry as one general update
            parsed_updates.append({
                'id': entry_id,
                'date': date_str,
                'updated': updated_str,
                'link': alternate_link,
                'type': 'General',
                'content': html_content.strip()
            })
            continue

        for i, match in enumerate(h3_matches):
            update_type = match.group(1).strip()
            content_start = match.end()
            content_end = h3_matches[i+1].start() if i + 1 < len(h3_matches) else len(html_content)
            
            sub_content = html_content[content_start:content_end].strip()
            
            # Create a unique ID for each sub-update to allow specific referencing
            sub_id = f"{entry_id}#{update_type}-{i}"
            
            parsed_updates.append({
                'id': sub_id,
                'date': date_str,
                'updated': updated_str,
                'link': f"{alternate_link}#{update_type}-{i}" if alternate_link else "",
                'type': update_type,
                'content': sub_content
            })
            
    return parsed_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/updates', methods=['GET'])
def get_updates():
    """
    Fetches the BigQuery Release Notes RSS feed, parses it, and returns JSON.
    Can force refresh using query param ?refresh=true
    """
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    global _feed_cache
    if not force_refresh and _feed_cache["data"] is not None:
        return jsonify({
            "status": "success",
            "source": "cache",
            "updates": _feed_cache["data"]
        })
        
    try:
        # Perform request with timeout
        headers = {}
        if not force_refresh:
            if _feed_cache["etag"]:
                headers["If-None-Match"] = _feed_cache["etag"]
            if _feed_cache["last_modified"]:
                headers["If-Modified-Since"] = _feed_cache["last_modified"]
                
        response = requests.get(FEED_URL, headers=headers, timeout=10)
        
        if response.status_code == 304 and _feed_cache["data"] is not None:
            # Source cache if feed not modified
            return jsonify({
                "status": "success",
                "source": "cache_not_modified",
                "updates": _feed_cache["data"]
            })
            
        if response.status_code == 200:
            xml_content = response.content
            updates = parse_xml_feed(xml_content)
            
            # Update cache
            _feed_cache["data"] = updates
            _feed_cache["etag"] = response.headers.get("ETag")
            _feed_cache["last_modified"] = response.headers.get("Last-Modified")
            
            return jsonify({
                "status": "success",
                "source": "live",
                "updates": updates
            })
        else:
            # If request fails but we have cached data, fallback to cache
            if _feed_cache["data"] is not None:
                return jsonify({
                    "status": "warning",
                    "message": f"Feed returned status code {response.status_code}. Loaded cached data.",
                    "source": "cache_fallback",
                    "updates": _feed_cache["data"]
                })
            else:
                return jsonify({
                    "status": "error",
                    "message": f"Failed to fetch feed from Google: Status {response.status_code}",
                    "updates": []
                }), response.status_code
                
    except Exception as e:
        if _feed_cache["data"] is not None:
            return jsonify({
                "status": "warning",
                "message": f"Network error: {str(e)}. Loaded cached data.",
                "source": "cache_fallback",
                "updates": _feed_cache["data"]
            })
        else:
            return jsonify({
                "status": "error",
                "message": f"Network or processing error: {str(e)}",
                "updates": []
            }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
