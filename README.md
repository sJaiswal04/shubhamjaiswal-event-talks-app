# BigQuery Release Notes Dashboard & X (Twitter) Share Tool

A modern, responsive Flask-based dashboard designed to parse, aggregate, filter, and share updates from the official Google Cloud BigQuery Release Notes Atom Feed.

## 🚀 Features

- **Automated RSS/Atom Parsing**: Periodically fetches and parses the official BigQuery Release Notes XML feed.
- **Smart Caching System**: Employs local file-based caching (`feed_cache.json`) to minimize API latency and ensure graceful fallback when the upstream feed is offline or rate-limiting.
- **Interactive Metrics & Statistics**: Real-time counters showing the breakdown of updates by categories: Features, Issues, Changes, and Deprecations.
- **Advanced UI Filtering & Search**:
  - Filter updates instantly by category (All, Features, Issues, Changes, Deprecations).
  - Search update contents or publication dates locally with instant UI refresh.
- **Tweet Composer Drawer**:
  - Select any release card to automatically draft a tailored tweet (constrained to X's 280-character limit).
  - One-click copy or instant sharing directly to X (Twitter).
  - Suggested context-aware hashtags like `#BigQuery`, `#GoogleCloud`, `#GCP`, `#DataEngineering`, `#GenerativeAI`.
- **Dynamic Theming**: Smooth transition between premium Dark and Light modes using modern HSL-based styling.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.x, Flask (lightweight WSGI web application framework)
- **Frontend**: Vanilla HTML5, CSS3 (Custom Design System, CSS Variables), Modern ES6+ JavaScript
- **Typography**: Outfit & Plus Jakarta Sans (loaded dynamically via Google Fonts)
- **Icons**: Inline SVGs for lightweight, crisp rendering in light & dark modes.

---

## 📁 Directory Structure

```text
bq-releases-notes/
├── app.py                # Flask application, feed fetching/parsing, and API routes
├── feed_cache.json       # Cached copy of parsed release notes (auto-generated)
├── templates/
│   └── index.html        # Main dashboard template
└── static/
    ├── css/
    │   └── style.css     # Theme variables, responsive layouts, and animations
    └── js/
        └── main.js       # Search, filter, theme switching, and tweet drawer logic
```

---

## ⚙️ Setup and Installation

### 1. Prerequisites
Ensure you have Python 3.x installed on your system:
```bash
python3 --version
```

### 2. Install Dependencies
Install Flask using pip:
```bash
pip install Flask
```

### 3. Run the Application
Navigate to the project directory and run the Flask server:
```bash
python3 app.py
```
By default, the server will start on port **`5001`**:
- Open your browser and navigate to: **[http://127.0.0.1:5001](http://127.0.0.1:5001)**

---

## 🔌 API Documentation

### Get Release Notes
Returns the cached or freshly parsed release notes XML from the Google Cloud feed.

* **Endpoint**: `/api/releases`
* **Method**: `GET`
* **Query Parameters**:
  - `refresh` (boolean, optional): Set to `true` to force a cache refresh and bypass the cached JSON file.
* **Response Format**: `JSON`
* **Success Response Example**:
  ```json
  {
    "entries": [
      {
        "date": "June 15, 2026",
        "raw_date": "2026-06-15T00:00:00-07:00",
        "link": "https://cloud.google.com/bigquery/docs/release-notes#June_15_2026",
        "updates": [
          {
            "id": "up-1",
            "type": "Feature",
            "html": "<p>BigQuery now supports...</p>",
            "text": "BigQuery now supports..."
          }
        ]
      }
    ],
    "stats": {
      "total_updates": 1,
      "feature": 1,
      "issue": 0,
      "change": 0,
      "deprecation": 0,
      "other": 0
    },
    "last_updated": "2026-06-16 23:19:00"
  }
  ```
