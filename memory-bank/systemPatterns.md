# System Patterns: Open Heritage 3D Enhanced Data Scraper

## Architecture Overview
The system follows an enhanced five-component architecture with two-phase extraction and web interface:

1. **Main Scraper Component**: Handles the primary listing extraction
   - Uses axios for HTTP requests with User-Agent headers
   - Uses cheerio for HTML parsing of table data
   - Extracts basic project information and critical links

2. **Detail Scraper Component**: Processes individual project pages
   - Fetches comprehensive metadata from project URLs
   - Implements robust label normalization for HTML variations
   - Extracts complex data structures (contributors, technical specs)
   - Integrates external APIs (DataCite) for scholarly metadata

3. **Enhanced Database Component**: Two-table schema with JSON support
   - `heritage_projects`: Core project information
   - `project_details`: Rich metadata with JSON fields
   - Implements upsert patterns for both tables
   - Maintains referential integrity via DOI foreign keys

4. **Concurrent Processing Engine**: Manages large-scale extraction
   - Controlled concurrency with configurable limits (default: 3)
   - Rate limiting with randomized delays (1-2 seconds)
   - Comprehensive error handling and recovery
   - Progress tracking and detailed logging

5. **Web Viewer Component**: Interactive database interface
   - Express.js server for HTTP handling and static file serving
   - REST API endpoint for JSON data access
   - Client-side sorting and data manipulation
   - Responsive web interface with modern UI design

## Key Design Patterns

### Two-Phase Extraction Pattern
```javascript
// Phase 1: Basic listing extraction
const projects = await fetchData();
await processProjectsBasicData(db, projects);

// Phase 2: Detailed page processing with concurrency control
await processProjectsWithDetails(db, projects, maxConcurrency);
```

### Enhanced Database Schema Pattern
```sql
-- Core projects table
CREATE TABLE heritage_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT NOT NULL,
    country TEXT,
    doi TEXT UNIQUE NOT NULL,
    status TEXT,
    collectors TEXT,
    keywords TEXT,
    contributor TEXT,
    project_link TEXT,  -- Critical for detail extraction
    doi_link TEXT,
    collectors_link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Comprehensive details table
CREATE TABLE project_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doi TEXT UNIQUE NOT NULL,
    site_description TEXT,
    project_description TEXT,
    collection_date TEXT,
    publication_date TEXT,
    license TEXT,
    license_url TEXT,
    point_cloud_iframe TEXT,
    center_lat REAL,
    center_lng REAL,
    bbox_json TEXT,              -- Geographic boundaries as JSON
    data_types_json TEXT,        -- Equipment and specifications as JSON
    contributors_json TEXT,      -- Contributor networks as JSON
    downloads_json TEXT,         -- Available files as JSON
    datacite_json TEXT,          -- Scholarly metadata as JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(doi) REFERENCES heritage_projects(doi)
);
```

### Label Normalization Pattern
```javascript
function normalizeLabel(text) {
    return text.toLowerCase()
              .trim()
              .replace(/\s+/g, '')
              .replace(/[^\w]/g, '');
}

// Enables robust matching across HTML variations:
// "License Type" -> "licensetype"
// "Collection Date" -> "collectiondate"
// "Site Description" -> "sitedescription"
```

### Entity Extraction Pattern
```javascript
function extractEntities(cell) {
    const $cell = cheerio.load(cell);
    const entities = [];
    
    // Handle linked entities
    $cell('a').each((i, el) => {
        const $el = $cell(el);
        entities.push({
            name: $el.text().trim(),
            link: $el.attr('href')
        });
    });
    
    // Fallback to comma-separated text
    if (entities.length === 0) {
        const text = $cell.text().trim();
        text.split(',').forEach(name => {
            entities.push({ name: name.trim(), link: null });
        });
    }
    
    return entities;
}
```

### Geographic Data Extraction Pattern
```javascript
function extractCoordinates(html) {
    // Extract center coordinates from JavaScript
    const latMidMatch = html.match(/lat_mid\s*=\s*\(\s*([0-9.-]+)\s*\+\s*([0-9.-]+)\)\s*\/\s*2/);
    const lngMidMatch = html.match(/lng_mid\s*=\s*\(\s*([0-9.-]+)\s*\+\s*([0-9.-]+)\)\s*\/\s*2/);
    
    // Extract bounding box coordinates
    const cordsMatch = html.match(/cords\s*=\s*\[\s*((?:\{[^}]+\},?\s*)+)\]/);
    
    return {
        center_lat: calculateCenter(latMidMatch),
        center_lng: calculateCenter(lngMidMatch),
        bbox: parseBoundingBox(cordsMatch)
    };
}
```

### Concurrent Processing Pattern
```javascript
async function processProjectsWithDetails(db, projects, maxConcurrency = 3) {
    const semaphore = [];
    
    for (const project of projects) {
        // Wait for available slot
        if (semaphore.length >= maxConcurrency) {
            await Promise.race(semaphore);
        }
        
        // Process with cleanup
        const processPromise = processProjectDetail(project)
            .finally(() => {
                const index = semaphore.indexOf(processPromise);
                if (index > -1) semaphore.splice(index, 1);
            });
        
        semaphore.push(processPromise);
        
        // Rate limiting
        await sleep(1000 + Math.random() * 1000);
    }
    
    // Wait for completion
    await Promise.all(semaphore);
}
```

## External Integration Patterns

### DataCite API Integration
```javascript
async function fetchDataCiteMetadata(doi) {
    const url = `https://api.datacite.org/dois/${encodeURIComponent(doi)}`;
    const response = await axios.get(url, {
        headers: {
            'Accept': 'application/vnd.api+json',
            'User-Agent': 'OpenHeritage3D-Scraper/1.0'
        },
        timeout: 10000
    });
    return response.data;
}
```

## Web Viewer Patterns

### Express Server Pattern
```javascript
const app = express();
const PORT = 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for JSON data
app.get('/api/projects', (req, res) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);
    // Query and return filtered columns
});

app.listen(PORT, 'localhost', () => {
    console.log(`Heritage Database Viewer running at http://localhost:${PORT}`);
});
```

### Client-Side Sorting Pattern
```javascript
function sortTable(column) {
    // Toggle sort direction
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    // Sort data with type-aware comparison
    projectsData.sort((a, b) => {
        const result = compareValues(a[column], b[column], column);
        return currentSort.direction === 'desc' ? -result : result;
    });
    
    updateSortIndicators();
    renderTable();
}
```

### Smart Data Type Detection Pattern
```javascript
function compareValues(a, b, column) {
    // Handle empty values
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    
    // Type-specific comparisons
    switch (column) {
        case 'publication_date':
            return compareDates(a, b);
        case 'reuse_score':
            return compareNumbers(a, b);
        default:
            return compareStrings(a, b);
    }
}
```

### Responsive Data Loading Pattern
```javascript
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        projectsData = await response.json();
        hideLoading();
        renderTable();
        updateProjectCount();
        
    } catch (error) {
        showError(error);
    }
}
```

## Error Handling Patterns
- **Network Resilience**: Timeout handling and graceful degradation
- **Data Validation**: Type checking and null-safe operations
- **Progress Preservation**: Individual page failures don't stop overall process
- **Detailed Logging**: Comprehensive error reporting with context
- **Recovery Mechanisms**: Partial failure handling and retry logic

## Performance Optimization Patterns
1. **Controlled Concurrency**: Balances speed with server courtesy
2. **JSON Storage**: Efficient storage of complex nested data
3. **Incremental Processing**: Updates only changed records
4. **Memory Efficiency**: Stream processing and cleanup of large datasets
5. **Database Optimization**: Proper indexing on DOI fields

## Security and Compliance Patterns
1. **Respectful Scraping**: Rate limiting and user-agent identification
2. **Public Data Only**: No authentication bypass or private data access
3. **License Compliance**: Extracts and preserves license information
4. **API Guidelines**: Follows DataCite API best practices
5. **Data Integrity**: Maintains source attribution and scholarly standards
