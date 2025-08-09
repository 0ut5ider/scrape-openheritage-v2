# Open Heritage 3D Enhanced Data Scraper & Viewer

A comprehensive Node.js system that scrapes, processes, and displays heritage site data from the Open Heritage 3D platform. This project extracts both basic listing information and detailed metadata from individual project pages, storing everything in a local SQLite database with an interactive web viewer.

## 🚀 Features

### Data Extraction
- **Complete table scraping**: Fetches all visible and hidden columns from the main data table
- **Detailed page processing**: Extracts comprehensive metadata from 470+ individual project pages
- **Geographic data**: Coordinates and bounding boxes from embedded maps
- **Technical specifications**: Equipment details, data types, and file sizes
- **Scholarly integration**: DataCite API metadata collection
- **License information**: Complete Creative Commons license extraction
- **Contributor networks**: People, organizations, funders, and partners
- **Point cloud viewers**: Embedded 3D visualization links

### Database Architecture
- **Two-table design**: Optimized schema with `heritage_projects` + `project_details`
- **JSON storage**: Complex data structures stored efficiently
- **Foreign key relationships**: Proper referential integrity
- **Upsert operations**: Safe updates without duplicates

### Web Viewer
- **Interactive table interface**: Sortable columns with smart data type detection
- **REST API**: GET `/api/projects` endpoint for JSON data access
- **Responsive design**: Works on desktop and mobile devices
- **Real-time loading**: Dynamic data fetching from SQLite database
- **Client-side sorting**: No server round-trips for sorting operations

## 📋 Requirements

- **Node.js v14+**: JavaScript runtime
- **npm**: Package manager
- **Internet connectivity**: For DataCite API integration
- **Web browser**: For viewing the interactive interface

## 🔧 Setup

1. **Install dependencies**:
```bash
npm install
```

## 📊 Usage

### 1. Data Extraction
Extract heritage site data from Open Heritage 3D:
```bash
npm start
# or
node scrape.js
```

This will:
- Fetch 471 projects from the main listing
- Process individual project pages for detailed metadata
- Store everything in `heritage.db`
- Display progress and statistics

### 2. Database Inspection
View extraction statistics and sample data:
```bash
node db_check.js
```

### 3. Web Viewer
Launch the interactive web interface:
```bash
node viewer/server.js
```

Then open http://localhost:3000 in your browser to:
- View sortable table of all projects
- Sort by project name, country, status, reuse score, publication date
- Click project links to view original heritage site pages
- See real-time project count and loading states

## 🗄️ Database Schema

### Primary Projects Table (`heritage_projects`)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-incrementing ID |
| project_name | TEXT | Name of the heritage project |
| country | TEXT | Country location |
| doi | TEXT UNIQUE | Digital Object Identifier (unique key) |
| status | TEXT | Publication status |
| collectors | TEXT | Data collectors/organizations |
| keywords | TEXT | Project keywords (hidden column) |
| contributor | TEXT | Contributors (hidden column) |
| project_link | TEXT | Link to project details page |
| doi_link | TEXT | Link to DOI page |
| collectors_link | TEXT | Link to collectors' page |
| created_at | DATETIME | Record creation timestamp |
| updated_at | DATETIME | Record last update timestamp |

### Detailed Metadata Table (`project_details`)
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Auto-incrementing ID |
| doi | TEXT UNIQUE | Foreign key to heritage_projects |
| site_description | TEXT | Rich HTML site description |
| project_description | TEXT | Technical project details |
| collection_date | TEXT | Data collection timeframe |
| publication_date | TEXT | Publication/release date |
| license | TEXT | License type (e.g., CC BY-NC-SA) |
| license_url | TEXT | Full license URL |
| reuse_score | TEXT | Data reusability assessment |
| point_cloud_iframe | TEXT | Embedded 3D viewer URL |
| center_lat/center_lng | REAL | Geographic center coordinates |
| bbox_json | TEXT | Geographic bounding box (JSON) |
| data_types_json | TEXT | Equipment & specifications (JSON) |
| contributors_json | TEXT | Contributor networks (JSON) |
| downloads_json | TEXT | Available files (JSON) |
| datacite_json | TEXT | Complete DataCite metadata (JSON) |
| created_at | DATETIME | Record creation timestamp |
| updated_at | DATETIME | Record last update timestamp |

## 📈 Performance & Results

### Extraction Statistics
- **471 total projects** processed (100% coverage)
- **470 detailed extractions** completed (99.8% success)
- **469 license extractions** (99.6% success)
- **313 point cloud viewers** identified
- **428 DataCite records** integrated (90.9% success)
- **Processing time**: ~5 minutes for complete extraction

### Data Quality
- **Geographic data**: Precise coordinates for mapping
- **Technical metadata**: Equipment specifications and methodologies
- **Scholarly standards**: DOI and citation information
- **License compliance**: Complete Creative Commons data
- **Network analysis**: Contributor relationship data

## 🔍 Sample Data

```json
{
  "project_name": "Ushaiger Tower Center",
  "country": "Saudi Arabia",
  "status": "Published",
  "license": "CC BY-NC-ND",
  "collection_date": "2013-04-01 to 2013-04-29",
  "publication_date": "2015",
  "reuse_score": "4/5",
  "contributors": [
    {"name": "Dick Ainsworth", "link": "..."},
    {"name": "Tom DeFanti", "link": "..."}
  ],
  "coordinates": {"lat": 25.339, "lng": 45.178},
  "data_types": [
    {"type": "Photogrammetry - Terrestrial", "size": "0.6 GB"},
    {"type": "Data Derivatives", "size": "1 GB"}
  ]
}
```

## 🛠️ Technical Architecture

### Technologies Used
- **Node.js**: JavaScript runtime
- **Express.js**: Web server framework
- **SQLite3**: Lightweight database with JSON support
- **Axios**: HTTP client for web scraping and API calls
- **Cheerio**: jQuery-like HTML parsing
- **Modern JavaScript**: ES6+ with async/await

### Key Features
- **Concurrent processing**: Rate-limited extraction (3 simultaneous requests)
- **Error handling**: Graceful degradation with detailed logging
- **JSON storage**: Efficient storage of complex nested data
- **Geographic extraction**: Coordinates from embedded JavaScript maps
- **API integration**: DataCite scholarly metadata collection
- **Responsive design**: Mobile-friendly web interface

## 🔒 Compliance & Ethics

- **Respectful scraping**: Rate limiting and proper User-Agent identification
- **Public data only**: No authentication bypass or private content access
- **License preservation**: Complete Creative Commons license extraction
- **Attribution maintenance**: Proper source crediting and scholarly standards
- **API compliance**: DataCite best practices and error handling

## 📝 Notes

- **Safe re-execution**: Scripts can be run multiple times safely
- **Incremental updates**: Existing records updated with new information
- **Local storage**: Database file created in project directory
- **Absolute URLs**: All links converted to full URLs where necessary
- **Localhost only**: Web viewer binds to localhost for security

## 🚀 Getting Started Quick Guide

1. **Clone and install**:
   ```bash
   npm install
   ```

2. **Extract data**:
   ```bash
   node scrape.js
   ```

3. **Launch viewer**:
   ```bash
   node viewer/server.js
   ```

4. **Open browser**: Visit http://localhost:3000

You now have a complete heritage database with an interactive web interface! 🏛️
