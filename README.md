# BigQuery Release Notes Tracker & Tweet Composer

A sleek, responsive dark-themed web application built with Python Flask and plain vanilla HTML, JavaScript, and CSS. The app fetches the latest Google Cloud BigQuery release notes, parses them into individual update cards, and lets you quickly select and format tweets about them using optimized tweet templates.

## Features

- **Automatic Feed Parsing**: Fetches the official Google Cloud BigQuery XML feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) and splits entries into individual granular updates based on header tags (e.g. Features, Changes, Deprecations).
- **Manual Refresh & Spinner**: An animated sync button to instantly refresh the feed from Google with custom spinners and toast feedback.
- **Client-Side Search & Filtering**: Real-time fuzzy searching of updates, filtering by update type (Feature, Change, Deprecation, General), and sorting by date (Newest/Oldest first).
- **Metrics Dashboard Widgets**: Quick overview counters of updates by category.
- **Smart Tweet Composer**: 
  - Selecting any update card opens a custom, glassmorphic Tweet Composer modal.
  - Automatically formats the update into a Tweet using multiple styles (Classic, Exciting, Professional, Minimal).
  - Dynamically calculates the character count limit and **smartly truncates the update text** to fit the 280-character limit, ensuring the links and hashtags are never cut off.
  - Toggles to include/exclude the source link or hashtags.
  - Action buttons to copy to clipboard or post directly to X/Twitter using a Web Intent URL (no developer API credentials or OAuth setups required).

## Project Structure

```text
bq-release-notes/
├── app.py                 # Flask server backend
├── requirements.txt       # Python dependencies
├── run.sh                 # Startup shell script
├── README.md              # Project entry guide
├── docs/                  # Detailed documentation folder
│   ├── app_explanation.md      # Server-side Flask logic documentation
│   └── architecture_and_flow.md # End-to-end client-server system flow
├── static/
│   ├── css/
│   │   └── style.css      # Custom styling (design tokens, animations, responsive grids)
│   └── js/
│       └── app.js         # Frontend interactive logic
└── templates/
    └── index.html         # Main dashboard markup
```

## Documentation Reference
For in-depth explanations of the system's design and flow, see the following documents:
- [docs/architecture_and_flow.md](file:///Users/tomhr/AG_Workspaces/5dgi/agy-cli-projects/bq-release-notes/docs/architecture_and_flow.md) - System architecture layout, server-client splits, and request-response flow diagrams.
- [docs/app_explanation.md](file:///Users/tomhr/AG_Workspaces/5dgi/agy-cli-projects/bq-release-notes/docs/app_explanation.md) - Detailed breakdown of the Flask backend, regex parsing logic, and caching algorithms.


## Setup & Running

You can easily set up and start the application using the included startup shell script:

1. **Start the Application**:
   ```bash
   ./run.sh
   ```
   This script will automatically create a virtual environment (`venv`), install the required dependencies (`Flask`, `requests`), and launch the server.

2. **Access the Web Dashboard**:
   Open your browser and navigate to:
   ```text
   http://localhost:5001
   ```

## Development and Customization

### Port Configuration
The application is configured to run on port `5001` by default in `app.py`. If you want to use a different port, modify the `port` parameter in the `app.run` call at the bottom of [app.py](file:///Users/tomhr/AG_Workspaces/5dgi/agy-cli-projects/bq-release-notes/app.py).

### Styling Customizations
Design tokens like colors, fonts, shadows, and transition durations are defined as CSS variables at the root of [style.css](file:///Users/tomhr/AG_Workspaces/5dgi/agy-cli-projects/bq-release-notes/static/css/style.css).
