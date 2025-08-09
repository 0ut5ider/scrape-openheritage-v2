const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./heritage.db');

// Show detailed info for a project that had details extracted
db.get(`
  SELECT p.project_name, p.country, p.doi, p.status,
         d.license, d.license_url, d.collection_date, d.publication_date,
         d.point_cloud_iframe, d.center_lat, d.center_lng,
         d.contributors_json, d.data_types_json, d.downloads_json,
         CASE WHEN d.datacite_json IS NOT NULL THEN 'Yes' ELSE 'No' END as has_datacite,
         LENGTH(d.site_description) as description_length
  FROM heritage_projects p 
  INNER JOIN project_details d ON p.doi = d.doi 
  WHERE d.license IS NOT NULL
  LIMIT 1
`, (err, row) => {
  if (err) {
    console.error('Error:', err.message);
  } else if (row) {
    console.log('\n=== Detailed Project Example ===');
    console.log('Project:', row.project_name);
    console.log('Country:', row.country);
    console.log('DOI:', row.doi);
    console.log('Status:', row.status);
    console.log('License:', row.license);
    console.log('License URL:', row.license_url);
    console.log('Collection Date:', row.collection_date);
    console.log('Publication Date:', row.publication_date);
    console.log('Has Point Cloud:', row.point_cloud_iframe ? 'Yes' : 'No');
    console.log('Center Coordinates:', row.center_lat ? `${row.center_lat}, ${row.center_lng}` : 'Not available');
    console.log('Description Length:', row.description_length, 'characters');
    console.log('Has DataCite:', row.has_datacite);
    
    if (row.contributors_json) {
      const contributors = JSON.parse(row.contributors_json);
      console.log('Contributors:', contributors.map(c => c.name).join(', '));
    }
    
    if (row.data_types_json) {
      const dataTypes = JSON.parse(row.data_types_json);
      console.log('Data Types:', dataTypes.map(dt => `${dt.type} (${dt.size})`).join(', '));
    }
    
    if (row.downloads_json) {
      const downloads = JSON.parse(row.downloads_json);
      console.log('Download Files:', downloads.length, 'file(s) available');
    }
  } else {
    console.log('No detailed project found with license info');
  }
  
  // Show statistics
  db.all(`
    SELECT 
      COUNT(*) as total_projects,
      COUNT(d.doi) as projects_with_details,
      COUNT(d.license) as projects_with_license,
      COUNT(d.point_cloud_iframe) as projects_with_pointcloud,
      COUNT(d.datacite_json) as projects_with_datacite
    FROM heritage_projects p 
    LEFT JOIN project_details d ON p.doi = d.doi
  `, (err, stats) => {
    if (!err && stats[0]) {
      const s = stats[0];
      console.log('\n=== Database Statistics ===');
      console.log(`Total projects: ${s.total_projects}`);
      console.log(`Projects with details: ${s.projects_with_details}`);
      console.log(`Projects with license info: ${s.projects_with_license}`);
      console.log(`Projects with point clouds: ${s.projects_with_pointcloud}`);
      console.log(`Projects with DataCite metadata: ${s.projects_with_datacite}`);
    }
    db.close();
  });
});
