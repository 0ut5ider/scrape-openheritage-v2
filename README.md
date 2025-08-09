# Open Heritage 3D Enhanced Data Scraper & Viewer

I wanted to be able to sort the Open Heritage database based on publication date.  
This project will create a clone of the Open Heritage db, and allow you to sort based on any table header name.

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

You now have a complete heritage database with an interactive web interface! 🏛️
