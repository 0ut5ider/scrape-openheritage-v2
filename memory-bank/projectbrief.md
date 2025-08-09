# Open Heritage 3D Enhanced Data Scraper

## Purpose
This project creates a comprehensive data extraction system that scrapes both the main listing and detailed individual project pages from the Open Heritage 3D website. The goal is to maintain a complete, offline database of heritage site information with rich metadata, technical specifications, and scholarly references.

## Scope
### Phase 1: Basic Listing (Completed)
- Scrape all projects listed on https://openheritage3d.org/data#
- Store core project information in SQLite database
- Capture all table columns including hidden ones (Keywords, Contributor)
- Preserve links from the original table

### Phase 2: Enhanced Detail Extraction (Completed)
- Process individual project pages via "project_link" URLs
- Extract comprehensive metadata including:
  - Site and project descriptions
  - License information and URLs
  - Collection and publication dates
  - Contributors, collectors, funders, partners
  - Technical specifications (data types, equipment, file sizes)
  - Geographic coordinates and bounding boxes
  - Point cloud viewer integration
  - Download file information
  - DataCite scholarly metadata integration

### Phase 3: Database Viewer (Completed)
- Web-based viewer for database contents
- Express.js server with REST API endpoint
- Sortable table interface with client-side sorting
- Display key columns: project name, country, status, project link, reuse score, publication date
- Responsive design with modern UI styling
- Real-time data loading from SQLite database

## Architecture
- **Two-table database design**: Core projects + detailed metadata
- **JSON storage**: Complex data structures (contributors, data types, downloads)
- **External API integration**: DataCite for scholarly metadata
- **Concurrent processing**: Rate-limited extraction with error handling
- **Geographic data**: Coordinate extraction from JavaScript map configurations
- **Web viewer**: Express server with API and static file serving

## Requirements
- Node.js environment (v14+)
- Dependencies: axios, cheerio, sqlite3, express
- Internet connectivity for DataCite API integration
- Local storage capacity for comprehensive heritage database
- Web browser for viewing data through the web interface
