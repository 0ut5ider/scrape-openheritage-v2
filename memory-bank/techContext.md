# Tech Context: Open Heritage 3D Enhanced Data Scraper

## Technology Stack
### Core Technologies
- **Node.js**: JavaScript runtime for server-side execution (v14+ required)
- **SQLite3**: Lightweight, file-based database system with JSON support
- **Axios**: Promise-based HTTP client for website and API requests
- **Cheerio**: jQuery-like HTML parsing and manipulation library
- **Express.js**: Web application framework for HTTP server and API endpoints

### External Integrations
- **DataCite API**: Scholarly metadata integration (api.datacite.org)
- **Google Maps API**: Geographic coordinate extraction from embedded maps
- **Creative Commons**: License information extraction and validation

### Web Interface
- **Modern JavaScript**: ES6+ features with fetch API and async/await
- **CSS Grid/Flexbox**: Responsive layout without external frameworks
- **Client-side sorting**: Dynamic table manipulation without server round-trips

### Development Environment
- Operating System: Linux 6.14
- Shell: /bin/bash
- Code Editor: VSCode (with Cline extension)
- Working Directory: /home/outsider/Coding Projects/scrape-openheritage-v2

## Enhanced Implementation Details

### Two-Table Database Architecture
```sql
-- Primary projects table
CREATE TABLE heritage_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT NOT NULL,
    country TEXT,
    doi TEXT UNIQUE NOT NULL,           -- DOI serves as primary key
    status TEXT,
    collectors TEXT,
    keywords TEXT,                      -- Hidden column from main table
    contributor TEXT,                   -- Hidden column with additional contributors
    project_link TEXT,                 -- Critical for detail extraction
    doi_link TEXT,                     -- Full DOI URL
    collectors_link TEXT,              -- Collector organization links
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Comprehensive details table
CREATE TABLE project_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doi TEXT UNIQUE NOT NULL,
    site_description TEXT,             -- Rich HTML content from project pages
    project_description TEXT,          -- Technical project details
    external_project_link TEXT,        -- Links to related projects
    additional_information_link TEXT,   -- Additional resources
    collection_date TEXT,              -- Data collection timeframe
    publication_date TEXT,             -- Publication/release date
    license TEXT,                      -- License type (CC BY-NC-SA, etc.)
    license_url TEXT,                  -- Full license URL
    reuse_score TEXT,                  -- Data reusability assessment
    citation TEXT,                     -- Formatted citation string
    point_cloud_iframe TEXT,           -- Embedded point cloud viewer URL
    bbox_json TEXT,                    -- Geographic bounding box as JSON array
    center_lat REAL,                   -- Center latitude coordinate
    center_lng REAL,                   -- Center longitude coordinate
    data_types_json TEXT,              -- Equipment and file specifications as JSON
    downloads_json TEXT,               -- Available download files as JSON
    contributors_json TEXT,            -- Contributor network as JSON
    collectors_json TEXT,              -- Data collectors as JSON
    funders_json TEXT,                 -- Project funders as JSON
    partners_json TEXT,                -- Partner organizations as JSON
    site_authority TEXT,               -- Site management authority
    datacite_json TEXT,                -- Complete DataCite metadata as JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(doi) REFERENCES heritage_projects(doi)
);
```

### Enhanced Data Flow

1. **System Initialization**
   - Creates both database tables with proper foreign key relationships
   - Establishes connection pool for concurrent operations
   - Validates dependencies and network connectivity

2. **Phase 1: Main Listing Extraction**
   - HTTP GET request to https://openheritage3d.org/data# with proper User-Agent
   - Cheerio parsing of table with ID 'demo'
   - Extraction of all visible and hidden columns
   - Upsert operations to heritage_projects table

3. **Phase 2: Detailed Page Processing**
   - Concurrent fetching of individual project pages (max 3 simultaneous)
   - Complex HTML parsing with label normalization
   - Geographic coordinate extraction from JavaScript map configurations
   - DataCite API integration for scholarly metadata
   - JSON serialization of complex data structures
   - Upsert operations to project_details table

4. **Data Processing Patterns**
   - **Label Normalization**: Converts "License Type" → "licensetype" for consistent matching
   - **Entity Extraction**: Parses contributor lists with links and plain text fallbacks
   - **Geographic Processing**: Extracts coordinates and bounding boxes from embedded maps
   - **File Detection**: Identifies download files from hidden form inputs
   - **API Integration**: Fetches and stores complete DataCite metadata

5. **Completion and Reporting**
   - Comprehensive statistics on extraction success rates
   - Sample data verification and display
   - Graceful connection cleanup and resource management

### Advanced Dependencies
```json
{
  "dependencies": {
    "axios": "^1.6.0",           // HTTP client with timeout and retry support
    "cheerio": "^0.7.2",         // HTML parsing with jQuery-like selectors
    "sqlite3": "^5.1.6"          // SQLite with JSON support and concurrent access
  }
}
```

### Concurrent Processing Architecture
- **Semaphore Pattern**: Controls maximum concurrent requests (configurable, default: 3)
- **Rate Limiting**: 1-2 second delays between requests with randomization
- **Error Isolation**: Individual page failures don't affect overall process
- **Progress Tracking**: Real-time feedback on processing status
- **Resource Management**: Automatic cleanup of completed promises

### JSON Data Structures
```javascript
// Contributors JSON structure
{
  "contributors_json": [
    {
      "name": "CyArk",
      "link": "https://cyark.org/"
    },
    {
      "name": "World Monuments Fund",
      "link": "https://www.wmf.org/"
    }
  ]
}

// Data Types JSON structure
{
  "data_types_json": [
    {
      "type": "LiDAR - Terrestrial",
      "size": "20.85 GB",
      "device_name": "Leica HDS6000",
      "device_type": "Phase Based Laser Scanner"
    }
  ]
}

// Geographic Bounding Box JSON
{
  "bbox_json": [
    {"lat": 43.676800, "lng": 4.627307},
    {"lat": 43.676800, "lng": 4.628837},
    {"lat": 43.676119, "lng": 4.628837},
    {"lat": 43.676119, "lng": 4.627307}
  ]
}
```

## Enhanced Development Setup
1. **Prerequisites**: Node.js v14+, npm, internet connectivity
2. **Installation**: `npm install` (installs all dependencies)
3. **Execution**: `node scrape.js` (full two-phase extraction)
4. **Database Inspection**: `node db_check.js` (detailed statistics and sample data)

## Comprehensive Testing Strategy
### Automated Validation
- **Network resilience**: Timeout handling and retry mechanisms
- **Data integrity**: JSON validation and schema compliance
- **Geographic accuracy**: Coordinate boundary validation
- **API integration**: DataCite response format verification
- **Concurrency safety**: Race condition prevention and resource management

### Manual Verification Points
- Sample project detail extraction accuracy
- License URL validity and format compliance
- Geographic coordinate precision and boundary validation
- Contributor network completeness and link verification
- Download file availability and format specification accuracy

### Error Handling Coverage
- **Network failures**: Graceful degradation with detailed logging
- **Parsing errors**: Robust fallbacks for HTML structure variations
- **API failures**: DataCite unavailability handling
- **Database constraints**: Duplicate handling and referential integrity
- **Resource exhaustion**: Memory and connection pool management

## Performance Characteristics
- **Processing Rate**: ~470 projects in ~5 minutes (with rate limiting)
- **Success Rates**: 99.8% detail extraction, 99.6% license extraction, 90.9% DataCite integration
- **Memory Usage**: Optimized for streaming processing with automatic cleanup
- **Storage Efficiency**: JSON compression for complex data structures
- **Scalability**: Configurable concurrency for different hardware capabilities

## Security and Compliance Implementation
- **Respectful Scraping**: Proper User-Agent identification and rate limiting
- **Public Data Only**: No authentication bypass or private content access
- **License Preservation**: Complete Creative Commons license extraction and validation
- **Attribution Maintenance**: Proper source crediting and scholarly standards
- **API Compliance**: DataCite best practices and error handling
