const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, '..', 'heritage.db');

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get project data
app.get('/api/projects', (req, res) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
            return res.status(500).json({ error: 'Database connection failed' });
        }
    });

    const query = `
        SELECT 
            p.project_name,
            p.country,
            p.status,
            p.project_link,
            d.reuse_score,
            d.publication_date
        FROM heritage_projects p
        LEFT JOIN project_details d ON p.doi = d.doi
        ORDER BY p.project_name
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error executing query:', err.message);
            return res.status(500).json({ error: 'Database query failed' });
        }

        // Clean up the data - handle nulls and format consistently
        const projects = rows.map(row => ({
            project_name: row.project_name || '',
            country: row.country || '',
            status: row.status || '',
            project_link: row.project_link || '',
            reuse_score: row.reuse_score || '',
            publication_date: row.publication_date || ''
        }));

        res.json(projects);
    });

    db.close();
});

// Start server
app.listen(PORT, 'localhost', () => {
    console.log(`🌐 Heritage Database Viewer running at http://localhost:${PORT}`);
    console.log(`📊 Database: ${DB_PATH}`);
    console.log('📋 Available endpoints:');
    console.log('   GET / - Web interface');
    console.log('   GET /api/projects - JSON data');
});
