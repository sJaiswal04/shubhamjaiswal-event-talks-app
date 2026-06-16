import os
import re
import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "feed_cache.json"

def clean_html_tags(text):
    """Strips HTML tags and normalizes spaces for plain text representation."""
    clean = re.sub(r'<[^>]+>', '', text)
    clean = re.sub(r'\s+', ' ', clean)
    return clean.strip()

def parse_release_notes_xml(xml_content):
    """Parses BigQuery release notes Atom feed XML."""
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    root = ET.fromstring(xml_content)
    
    entries = []
    
    # Track statistics
    stats = {
        "total_updates": 0,
        "feature": 0,
        "issue": 0,
        "change": 0,
        "deprecation": 0,
        "other": 0
    }
    
    unique_id_counter = 1
    
    for entry in root.findall('atom:entry', namespaces):
        title = entry.find('atom:title', namespaces).text  # e.g., "June 15, 2026"
        updated_raw = entry.find('atom:updated', namespaces).text  # e.g., "2026-06-15T00:00:00-07:00"
        
        # Extract link
        link_elem = entry.find('atom:link[@rel="alternate"]', namespaces)
        if link_elem is None:
            link_elem = entry.find('atom:link', namespaces)
        link = link_elem.attrib.get('href') if link_elem is not None else ""
        
        content_elem = entry.find('atom:content', namespaces)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Split content_html by <h3> tags
        parts = re.split(r'<h3>', content_html)
        items = []
        
        for part in parts:
            if not part.strip():
                continue
            
            sub_parts = part.split('</h3>', 1)
            if len(sub_parts) == 2:
                update_type = sub_parts[0].strip()
                update_text_html = sub_parts[1].strip()
                plain_text = clean_html_tags(update_text_html)
                
                # Normalize types for stats
                type_lower = update_type.lower()
                if "feature" in type_lower:
                    stats["feature"] += 1
                elif "issue" in type_lower:
                    stats["issue"] += 1
                elif "change" in type_lower:
                    stats["change"] += 1
                elif "deprecation" in type_lower:
                    stats["deprecation"] += 1
                else:
                    stats["other"] += 1
                
                stats["total_updates"] += 1
                
                items.append({
                    "id": f"up-{unique_id_counter}",
                    "type": update_type,
                    "html": update_text_html,
                    "text": plain_text
                })
                unique_id_counter += 1
            else:
                plain_text = clean_html_tags(part)
                if plain_text:
                    stats["other"] += 1
                    stats["total_updates"] += 1
                    items.append({
                        "id": f"up-{unique_id_counter}",
                        "type": "General",
                        "html": part.strip(),
                        "text": plain_text
                    })
                    unique_id_counter += 1
        
        # Try parsing date to standardize it if possible
        formatted_date = title
        try:
            # Example format: "2026-06-15T00:00:00-07:00" -> extract "2026-06-15"
            date_part = updated_raw.split("T")[0]
            dt = datetime.strptime(date_part, "%Y-%m-%d")
            formatted_date = dt.strftime("%B %d, %Y")
        except Exception:
            pass
            
        entries.append({
            "date": formatted_date,
            "raw_date": updated_raw,
            "link": link,
            "updates": items
        })
        
    return {
        "entries": entries,
        "stats": stats,
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

def fetch_feed_data():
    """Fetches the XML feed and parses it, then saves to cache."""
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
        
        parsed_data = parse_release_notes_xml(xml_data)
        
        # Save to cache
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(parsed_data, f, ensure_ascii=False, indent=2)
            
        return parsed_data, None
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if force_refresh or not os.path.exists(CACHE_FILE):
        data, error = fetch_feed_data()
        if error:
            # If fetch fails but we have cached data, return cache with a warning
            if os.path.exists(CACHE_FILE):
                try:
                    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                        cached_data = json.load(f)
                    cached_data["warning"] = f"Failed to refresh feed: {error}. Displaying cached data."
                    return jsonify(cached_data)
                except Exception:
                    pass
            return jsonify({"error": f"Failed to load feed: {error}"}), 500
        return jsonify(data)
    else:
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cached_data = json.load(f)
            return jsonify(cached_data)
        except Exception as e:
            # If reading cache fails, try fetching
            data, error = fetch_feed_data()
            if error:
                return jsonify({"error": f"Failed to load cached feed and fetch failed: {error}"}), 500
            return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
