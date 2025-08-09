const axios = require('axios');
const cheerio = require('cheerio');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuration
const URL = 'https://openheritage3d.org/data#';
const DB_PATH = path.join(__dirname, 'heritage.db');

// Database setup
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
                reject(err);
                return;
            }
            console.log('Connected to SQLite database');
        });

        // Create main table if it doesn't exist
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS heritage_projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_name TEXT NOT NULL,
                country TEXT,
                doi TEXT UNIQUE NOT NULL,
                status TEXT,
                collectors TEXT,
                keywords TEXT,
                contributor TEXT,
                project_link TEXT,
                doi_link TEXT,
                collectors_link TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // Create project details table
        const createDetailsTableSQL = `
            CREATE TABLE IF NOT EXISTS project_details (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doi TEXT UNIQUE NOT NULL,
                site_description TEXT,
                project_description TEXT,
                external_project_link TEXT,
                additional_information_link TEXT,
                collection_date TEXT,
                publication_date TEXT,
                license TEXT,
                license_url TEXT,
                reuse_score TEXT,
                citation TEXT,
                point_cloud_iframe TEXT,
                bbox_json TEXT,
                center_lat REAL,
                center_lng REAL,
                data_types_json TEXT,
                downloads_json TEXT,
                contributors_json TEXT,
                collectors_json TEXT,
                funders_json TEXT,
                partners_json TEXT,
                site_authority TEXT,
                datacite_json TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(doi) REFERENCES heritage_projects(doi)
            )
        `;

        db.run(createTableSQL, (err) => {
            if (err) {
                console.error('Error creating main table:', err.message);
                reject(err);
                return;
            }
            console.log('Heritage projects table ready');
            
            db.run(createDetailsTableSQL, (err) => {
                if (err) {
                    console.error('Error creating details table:', err.message);
                    reject(err);
                    return;
                }
                console.log('Project details table ready');
                resolve(db);
            });
        });
    });
}

// Extract text and link from table cell
function extractCellData(cell) {
    const $cell = cheerio.load(cell);
    const link = $cell('a').attr('href');
    const text = $cell.text().trim();
    
    return {
        text: text,
        link: link ? (link.startsWith('http') ? link : `https://openheritage3d.org/${link}`) : null
    };
}

// Normalize label text for consistent matching
function normalizeLabel(text) {
    return text.toLowerCase().trim().replace(/\s+/g, '').replace(/[^\w]/g, '');
}

// Extract entities (contributors, collectors, etc.) from table cell
function extractEntities(cell) {
    const $cell = cheerio.load(cell);
    const entities = [];
    
    $cell('a').each((i, el) => {
        const $el = $cell(el);
        const href = $el.attr('href');
        const text = $el.text().trim();
        if (text) {
            entities.push({
                name: text,
                link: href ? (href.startsWith('http') ? href : `https://openheritage3d.org/${href}`) : null
            });
        }
    });
    
    // If no links, split by comma and create entities without links
    if (entities.length === 0) {
        const text = $cell.text().trim();
        if (text) {
            const names = text.split(',').map(n => n.trim()).filter(n => n);
            names.forEach(name => {
                entities.push({ name, link: null });
            });
        }
    }
    
    return entities;
}

// Fetch DataCite metadata for a DOI
async function fetchDataCiteMetadata(doi) {
    try {
        const url = `https://api.datacite.org/dois/${encodeURIComponent(doi)}`;
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/vnd.api+json',
                'User-Agent': 'OpenHeritage3D-Scraper/1.0'
            },
            timeout: 10000
        });
        
        return response.data;
    } catch (error) {
        console.warn(`Failed to fetch DataCite metadata for DOI ${doi}:`, error.message);
        return null;
    }
}

// Extract bounding box and center coordinates from page scripts
function extractCoordinates(html) {
    const result = {
        bbox: null,
        center_lat: null,
        center_lng: null
    };
    
    try {
        // Extract lat_mid and lng_mid
        const latMidMatch = html.match(/lat_mid\s*=\s*\(\s*([0-9.-]+)\s*\+\s*([0-9.-]+)\)\s*\/\s*2/);
        const lngMidMatch = html.match(/lng_mid\s*=\s*\(\s*([0-9.-]+)\s*\+\s*([0-9.-]+)\)\s*\/\s*2/);
        
        if (latMidMatch) {
            result.center_lat = (parseFloat(latMidMatch[1]) + parseFloat(latMidMatch[2])) / 2;
        }
        if (lngMidMatch) {
            result.center_lng = (parseFloat(lngMidMatch[1]) + parseFloat(lngMidMatch[2])) / 2;
        }
        
        // Extract cords array
        const cordsMatch = html.match(/cords\s*=\s*\[\s*((?:\{[^}]+\},?\s*)+)\]/);
        if (cordsMatch) {
            const coordsStr = cordsMatch[1];
            const coords = [];
            const coordMatches = coordsStr.matchAll(/\{\s*lat:\s*([0-9.-]+),\s*lng:\s*([0-9.-]+)\s*\}/g);
            
            for (const match of coordMatches) {
                coords.push({
                    lat: parseFloat(match[1]),
                    lng: parseFloat(match[2])
                });
            }
            
            if (coords.length > 0) {
                result.bbox = coords;
            }
        }
    } catch (error) {
        console.warn('Error extracting coordinates:', error.message);
    }
    
    return result;
}

// Extract download information from hidden form inputs
function extractDownloads($) {
    const downloads = [];
    
    try {
        // Look for hidden inputs with names starting with 'f'
        $('input[type="hidden"]').each((i, el) => {
            const $el = $(el);
            const name = $el.attr('name');
            const value = $el.attr('value');
            
            if (name && name.match(/^f\d+$/) && value && value.trim()) {
                downloads.push({
                    field: name,
                    value: value.replace(/^'|'$/g, '') // Remove surrounding quotes
                });
            }
        });
        
        // Also check console.log for download info
        const scripts = $('script');
        scripts.each((i, script) => {
            const content = $(script).html();
            if (content && content.includes('console.log')) {
                const consoleMatch = content.match(/console\.log\(([^)]+)\)/);
                if (consoleMatch) {
                    try {
                        const logContent = consoleMatch[1];
                        // Parse CSV-like content in console.log
                        if (logContent.includes(',')) {
                            const parts = logContent.split(',').map(p => p.trim().replace(/^'|'$/g, ''));
                            downloads.push({
                                field: 'console_log',
                                value: parts.join('|') // Join with pipe for easier parsing later
                            });
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }
            }
        });
    } catch (error) {
        console.warn('Error extracting downloads:', error.message);
    }
    
    return downloads;
}

// Fetch and parse the webpage
async function fetchData() {
    try {
        console.log(`Fetching data from: ${URL}`);
        const response = await axios.get(URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const projects = [];

        // Find the table and extract data
        const table = $('#demo');
        if (table.length === 0) {
            throw new Error('Table with id="demo" not found');
        }

        // Process each row in tbody
        table.find('tbody tr').each((index, row) => {
            const cells = $(row).find('th, td');
            
            if (cells.length >= 5) {
                // Extract data from visible columns
                const projectData = extractCellData(cells.eq(0).html());
                const countryData = extractCellData(cells.eq(1).html());
                const doiData = extractCellData(cells.eq(2).html());
                const statusData = extractCellData(cells.eq(3).html());
                const collectorsData = extractCellData(cells.eq(4).html());
                
                // Extract data from hidden columns (if they exist)
                let keywordsData = { text: '', link: null };
                let contributorData = { text: '', link: null };
                
                if (cells.length >= 7) {
                    keywordsData = extractCellData(cells.eq(5).html());
                    contributorData = extractCellData(cells.eq(6).html());
                }

                // Extract DOI from link or text
                let doi = doiData.text;
                if (doiData.link && doiData.link.includes('doi.org/')) {
                    const doiMatch = doiData.link.match(/doi\.org\/(.+)$/);
                    if (doiMatch) {
                        doi = doiMatch[1];
                    }
                }

                if (doi && doi !== 'N/A') {
                    projects.push({
                        project_name: projectData.text,
                        country: countryData.text,
                        doi: doi,
                        status: statusData.text,
                        collectors: collectorsData.text,
                        keywords: keywordsData.text,
                        contributor: contributorData.text,
                        project_link: projectData.link,
                        doi_link: doiData.link,
                        collectors_link: collectorsData.link
                    });
                }
            }
        });

        console.log(`Found ${projects.length} projects`);
        return projects;

    } catch (error) {
        console.error('Error fetching data:', error.message);
        throw error;
    }
}

// Fetch detailed information from a project page
async function fetchProjectDetails(project) {
    if (!project.project_link) {
        console.warn(`No project link for ${project.project_name}, skipping details`);
        return null;
    }
    
    try {
        console.log(`  📄 Fetching details for: ${project.project_name}`);
        const response = await axios.get(project.project_link, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 15000
        });

        const $ = cheerio.load(response.data);
        const details = {
            doi: project.doi,
            site_description: null,
            project_description: null,
            external_project_link: null,
            additional_information_link: null,
            collection_date: null,
            publication_date: null,
            license: null,
            license_url: null,
            reuse_score: null,
            citation: null,
            point_cloud_iframe: null,
            bbox_json: null,
            center_lat: null,
            center_lng: null,
            data_types_json: null,
            downloads_json: null,
            contributors_json: null,
            collectors_json: null,
            funders_json: null,
            partners_json: null,
            site_authority: null,
            datacite_json: null
        };

        // Extract iframe for point cloud viewer
        const iframe = $('#portreeViewer iframe, iframe').first();
        if (iframe.length) {
            details.point_cloud_iframe = iframe.attr('src');
        }

        // Extract coordinates from script tags
        const coordinates = extractCoordinates(response.data);
        details.bbox_json = coordinates.bbox ? JSON.stringify(coordinates.bbox) : null;
        details.center_lat = coordinates.center_lat;
        details.center_lng = coordinates.center_lng;

        // Extract download information
        const downloads = extractDownloads($);
        if (downloads.length > 0) {
            details.downloads_json = JSON.stringify(downloads);
        }

        // Process all tables to extract labeled data
        const dataTypes = [];
        
        $('table').each((i, table) => {
            const $table = $(table);
            const rows = $table.find('tr');
            
            // Check if this is a data types table
            const headerRow = rows.first();
            const headerCells = headerRow.find('th, td');
            const isDataTypeTable = headerCells.length >= 4 && 
                normalizeLabel(headerCells.eq(0).text()).includes('datatype');
            
            if (isDataTypeTable) {
                // Process data types table
                rows.slice(1).each((j, row) => {
                    const cells = $(row).find('td');
                    if (cells.length >= 4) {
                        dataTypes.push({
                            type: cells.eq(0).text().trim(),
                            size: cells.eq(1).text().trim(),
                            device_name: cells.eq(2).text().trim(),
                            device_type: cells.eq(3).text().trim()
                        });
                    }
                });
            } else {
                // Process key-value tables
                rows.each((j, row) => {
                    const cells = $(row).find('td, th');
                    if (cells.length >= 2) {
                        const label = normalizeLabel(cells.eq(0).text());
                        const valueCell = cells.eq(1);
                        
                        switch (label) {
                            case 'sitedescription':
                                details.site_description = valueCell.html();
                                break;
                            case 'projectdescription':
                                details.project_description = valueCell.html();
                                break;
                            case 'externalprojectlink':
                                const extLink = valueCell.find('a').attr('href');
                                details.external_project_link = extLink;
                                break;
                            case 'additionalinformation':
                                const addLink = valueCell.find('a').attr('href');
                                details.additional_information_link = addLink;
                                break;
                            case 'collectiondate':
                                details.collection_date = valueCell.text().trim();
                                break;
                            case 'publicationdate':
                                details.publication_date = valueCell.text().trim();
                                break;
                            case 'licensetype':
                                details.license = valueCell.text().trim();
                                const licenseLink = valueCell.find('a').attr('href');
                                if (licenseLink) {
                                    details.license_url = licenseLink.startsWith('http') ? 
                                        licenseLink : `https://${licenseLink}`;
                                }
                                break;
                            case 'reusescore':
                                details.reuse_score = valueCell.text().trim();
                                break;
                            case 'contributors':
                                const contributors = extractEntities(valueCell.html());
                                details.contributors_json = JSON.stringify(contributors);
                                break;
                            case 'collectors':
                                const collectors = extractEntities(valueCell.html());
                                details.collectors_json = JSON.stringify(collectors);
                                break;
                            case 'funders':
                                const funders = extractEntities(valueCell.html());
                                details.funders_json = JSON.stringify(funders);
                                break;
                            case 'partners':
                                const partners = extractEntities(valueCell.html());
                                details.partners_json = JSON.stringify(partners);
                                break;
                            case 'siteauthority':
                                const authority = extractEntities(valueCell.html());
                                details.site_authority = authority.length > 0 ? 
                                    JSON.stringify(authority) : valueCell.text().trim();
                                break;
                            case 'citation':
                                details.citation = valueCell.text().trim();
                                break;
                        }
                    }
                });
            }
        });

        if (dataTypes.length > 0) {
            details.data_types_json = JSON.stringify(dataTypes);
        }

        // Fetch DataCite metadata
        try {
            const dataciteData = await fetchDataCiteMetadata(project.doi);
            if (dataciteData) {
                details.datacite_json = JSON.stringify(dataciteData);
            }
        } catch (error) {
            console.warn(`DataCite fetch failed for ${project.doi}:`, error.message);
        }

        return details;

    } catch (error) {
        console.error(`Error fetching details for ${project.project_name}:`, error.message);
        return null;
    }
}

// Insert or update project data
function upsertProject(db, project) {
    return new Promise((resolve, reject) => {
        const upsertSQL = `
            INSERT INTO heritage_projects (
                project_name, country, doi, status, collectors, keywords, contributor,
                project_link, doi_link, collectors_link, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(doi) DO UPDATE SET
                project_name = excluded.project_name,
                country = excluded.country,
                status = excluded.status,
                collectors = excluded.collectors,
                keywords = excluded.keywords,
                contributor = excluded.contributor,
                project_link = excluded.project_link,
                doi_link = excluded.doi_link,
                collectors_link = excluded.collectors_link,
                updated_at = CURRENT_TIMESTAMP
        `;

        db.run(upsertSQL, [
            project.project_name,
            project.country,
            project.doi,
            project.status,
            project.collectors,
            project.keywords,
            project.contributor,
            project.project_link,
            project.doi_link,
            project.collectors_link
        ], function(err) {
            if (err) {
                console.error('Error upserting project:', err.message);
                reject(err);
                return;
            }
            resolve({ changes: this.changes, lastID: this.lastID });
        });
    });
}

// Insert or update project details
function upsertProjectDetails(db, details) {
    return new Promise((resolve, reject) => {
        const upsertSQL = `
            INSERT INTO project_details (
                doi, site_description, project_description, external_project_link,
                additional_information_link, collection_date, publication_date,
                license, license_url, reuse_score, citation, point_cloud_iframe,
                bbox_json, center_lat, center_lng, data_types_json, downloads_json,
                contributors_json, collectors_json, funders_json, partners_json,
                site_authority, datacite_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(doi) DO UPDATE SET
                site_description = excluded.site_description,
                project_description = excluded.project_description,
                external_project_link = excluded.external_project_link,
                additional_information_link = excluded.additional_information_link,
                collection_date = excluded.collection_date,
                publication_date = excluded.publication_date,
                license = excluded.license,
                license_url = excluded.license_url,
                reuse_score = excluded.reuse_score,
                citation = excluded.citation,
                point_cloud_iframe = excluded.point_cloud_iframe,
                bbox_json = excluded.bbox_json,
                center_lat = excluded.center_lat,
                center_lng = excluded.center_lng,
                data_types_json = excluded.data_types_json,
                downloads_json = excluded.downloads_json,
                contributors_json = excluded.contributors_json,
                collectors_json = excluded.collectors_json,
                funders_json = excluded.funders_json,
                partners_json = excluded.partners_json,
                site_authority = excluded.site_authority,
                datacite_json = excluded.datacite_json,
                updated_at = CURRENT_TIMESTAMP
        `;

        db.run(upsertSQL, [
            details.doi,
            details.site_description,
            details.project_description,
            details.external_project_link,
            details.additional_information_link,
            details.collection_date,
            details.publication_date,
            details.license,
            details.license_url,
            details.reuse_score,
            details.citation,
            details.point_cloud_iframe,
            details.bbox_json,
            details.center_lat,
            details.center_lng,
            details.data_types_json,
            details.downloads_json,
            details.contributors_json,
            details.collectors_json,
            details.funders_json,
            details.partners_json,
            details.site_authority,
            details.datacite_json
        ], function(err) {
            if (err) {
                console.error('Error upserting project details:', err.message);
                reject(err);
                return;
            }
            resolve({ changes: this.changes, lastID: this.lastID });
        });
    });
}

// Sleep function for rate limiting
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Process projects with concurrency control
async function processProjectsWithDetails(db, projects, maxConcurrency = 3) {
    let newProjects = 0;
    let updatedProjects = 0;
    let newDetails = 0;
    let updatedDetails = 0;
    
    // First, process all main project data
    console.log('\n🔄 Processing main project data...');
    for (const project of projects) {
        try {
            const result = await upsertProject(db, project);
            if (result.changes > 0) {
                if (result.lastID > 0) {
                    newProjects++;
                    console.log(`✓ Added new project: ${project.project_name} (DOI: ${project.doi})`);
                } else {
                    updatedProjects++;
                    console.log(`✓ Updated project: ${project.project_name} (DOI: ${project.doi})`);
                }
            }
        } catch (error) {
            console.error(`✗ Error processing project ${project.project_name}:`, error.message);
        }
    }
    
    // Then, process project details with concurrency control
    console.log('\n🔄 Processing project details...');
    const semaphore = [];
    
    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        
        // Wait for a slot if we're at max concurrency
        if (semaphore.length >= maxConcurrency) {
            await Promise.race(semaphore);
        }
        
        // Process this project's details
        const processPromise = (async () => {
            try {
                const details = await fetchProjectDetails(project);
                if (details) {
                    const result = await upsertProjectDetails(db, details);
                    if (result.changes > 0) {
                        if (result.lastID > 0) {
                            newDetails++;
                            console.log(`    ✓ Added details for: ${project.project_name}`);
                        } else {
                            updatedDetails++;
                            console.log(`    ✓ Updated details for: ${project.project_name}`);
                        }
                    }
                } else {
                    console.log(`    ⚠️  No details extracted for: ${project.project_name}`);
                }
                
                // Add a small delay to be polite to the server
                await sleep(1000 + Math.random() * 1000); // 1-2 second delay
                
            } catch (error) {
                console.error(`    ✗ Error processing details for ${project.project_name}:`, error.message);
            }
        })();
        
        semaphore.push(processPromise);
        
        // Clean up completed promises
        processPromise.finally(() => {
            const index = semaphore.indexOf(processPromise);
            if (index > -1) {
                semaphore.splice(index, 1);
            }
        });
    }
    
    // Wait for all remaining promises to complete
    await Promise.all(semaphore);
    
    return {
        newProjects,
        updatedProjects,
        newDetails,
        updatedDetails
    };
}

// Main function
async function main() {
    let db;
    
    try {
        console.log('🚀 Starting Open Heritage 3D scraper...\n');
        
        // Initialize database
        db = await initializeDatabase();
        
        // Fetch data from website
        const projects = await fetchData();
        
        if (projects.length === 0) {
            console.log('No projects found to process');
            return;
        }

        // Process projects and their details
        const results = await processProjectsWithDetails(db, projects);

        console.log('\n=== Summary ===');
        console.log(`📊 Total projects found: ${projects.length}`);
        console.log(`🆕 New projects added: ${results.newProjects}`);
        console.log(`🔄 Projects updated: ${results.updatedProjects}`);
        console.log(`📄 New project details added: ${results.newDetails}`);
        console.log(`🔄 Project details updated: ${results.updatedDetails}`);
        console.log(`💾 Database location: ${DB_PATH}`);
        
        // Show a sample of extracted data
        console.log('\n=== Sample Data Check ===');
        db.get(`
            SELECT p.project_name, p.country, p.doi, p.status,
                   d.license, d.collection_date, d.point_cloud_iframe,
                   CASE WHEN d.datacite_json IS NOT NULL THEN 'Yes' ELSE 'No' END as has_datacite
            FROM heritage_projects p 
            LEFT JOIN project_details d ON p.doi = d.doi 
            LIMIT 1
        `, (err, row) => {
            if (err) {
                console.error('Error fetching sample:', err.message);
            } else if (row) {
                console.log('Sample project:', {
                    name: row.project_name,
                    country: row.country,
                    doi: row.doi,
                    status: row.status,
                    license: row.license,
                    collection_date: row.collection_date,
                    has_point_cloud: row.point_cloud_iframe ? 'Yes' : 'No',
                    has_datacite: row.has_datacite
                });
            }
        });

    } catch (error) {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    } finally {
        if (db) {
            // Wait a moment for the sample query to complete
            setTimeout(() => {
                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                    } else {
                        console.log('\n🔚 Database connection closed');
                        console.log('✅ Scraping completed successfully!');
                    }
                });
            }, 1000);
        }
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { main, fetchData, initializeDatabase };
