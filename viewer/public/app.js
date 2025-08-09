// Global variables
let projectsData = [];
let currentSort = { column: null, direction: 'asc' };

// DOM elements
const loadingElement = document.getElementById('loading');
const tableContainer = document.getElementById('tableContainer');
const errorElement = document.getElementById('error');
const tableBody = document.getElementById('projectsTableBody');
const projectCountElement = document.getElementById('projectCount');

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadProjects();
        setupEventListeners();
    } catch (error) {
        showError(error);
    }
});

// Fetch projects data from API
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        projectsData = await response.json();
        console.log(`Loaded ${projectsData.length} projects`);
        
        hideLoading();
        renderTable();
        updateProjectCount();
        
    } catch (error) {
        console.error('Error loading projects:', error);
        throw error;
    }
}

// Setup event listeners for sortable headers
function setupEventListeners() {
    const sortableHeaders = document.querySelectorAll('th.sortable');
    
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-column');
            sortTable(column);
        });
    });
}

// Sort table by column
function sortTable(column) {
    // Determine sort direction
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    
    // Sort the data
    projectsData.sort((a, b) => {
        const aValue = a[column] || '';
        const bValue = b[column] || '';
        
        let result = compareValues(aValue, bValue, column);
        
        if (currentSort.direction === 'desc') {
            result = -result;
        }
        
        return result;
    });
    
    // Update visual indicators
    updateSortIndicators();
    
    // Re-render table
    renderTable();
}

// Compare values based on column type
function compareValues(a, b, column) {
    // Handle empty values
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    
    // Special handling for different column types
    switch (column) {
        case 'publication_date':
            return compareDates(a, b);
        
        case 'reuse_score':
            return compareNumbers(a, b);
        
        default:
            return compareStrings(a, b);
    }
}

// Compare dates (handles various date formats)
function compareDates(a, b) {
    const dateA = parseDate(a);
    const dateB = parseDate(b);
    
    // If both are valid dates
    if (dateA && dateB) {
        return dateA.getTime() - dateB.getTime();
    }
    
    // If only one is a valid date, valid date comes first
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    
    // If neither is a valid date, compare as strings
    return compareStrings(a, b);
}

// Parse date from string (handles common formats)
function parseDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    // Try parsing as ISO date first
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    
    // Try parsing other common formats
    const formats = [
        /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY
        /(\d{4})/, // Just year
    ];
    
    for (const format of formats) {
        const match = dateStr.match(format);
        if (match) {
            if (format.source.includes('(\\d{4})$')) {
                // Just year
                date = new Date(parseInt(match[1]), 0, 1);
            } else if (format.source.startsWith('(\\d{4})')) {
                // YYYY-MM-DD
                date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            } else {
                // MM/DD/YYYY or MM-DD-YYYY
                date = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
            }
            
            if (!isNaN(date.getTime())) return date;
        }
    }
    
    return null;
}

// Compare numbers (handles various number formats)
function compareNumbers(a, b) {
    const numA = parseFloat(a);
    const numB = parseFloat(b);
    
    // If both are valid numbers
    if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
    }
    
    // If only one is a valid number, valid number comes first
    if (!isNaN(numA) && isNaN(numB)) return -1;
    if (isNaN(numA) && !isNaN(numB)) return 1;
    
    // If neither is a valid number, compare as strings
    return compareStrings(a, b);
}

// Compare strings (case-insensitive)
function compareStrings(a, b) {
    return a.toString().toLowerCase().localeCompare(b.toString().toLowerCase());
}

// Update sort indicators in headers
function updateSortIndicators() {
    const headers = document.querySelectorAll('th.sortable');
    
    headers.forEach(header => {
        const column = header.getAttribute('data-column');
        
        // Remove existing sort classes
        header.classList.remove('sort-asc', 'sort-desc');
        
        // Add current sort class
        if (column === currentSort.column) {
            header.classList.add(`sort-${currentSort.direction}`);
        }
    });
}

// Render the table with current data
function renderTable() {
    tableBody.innerHTML = '';
    
    projectsData.forEach((project, index) => {
        const row = document.createElement('tr');
        
        // Project Name
        const nameCell = document.createElement('td');
        nameCell.textContent = project.project_name || 'N/A';
        row.appendChild(nameCell);
        
        // Country
        const countryCell = document.createElement('td');
        countryCell.textContent = project.country || 'N/A';
        row.appendChild(countryCell);
        
        // Status
        const statusCell = document.createElement('td');
        statusCell.textContent = project.status || 'N/A';
        row.appendChild(statusCell);
        
        // Project Link
        const linkCell = document.createElement('td');
        if (project.project_link) {
            const link = document.createElement('a');
            link.href = project.project_link;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'View Project';
            linkCell.appendChild(link);
        } else {
            linkCell.textContent = 'N/A';
        }
        row.appendChild(linkCell);
        
        // Reuse Score
        const scoreCell = document.createElement('td');
        scoreCell.textContent = project.reuse_score || 'N/A';
        row.appendChild(scoreCell);
        
        // Publication Date
        const dateCell = document.createElement('td');
        dateCell.textContent = project.publication_date || 'N/A';
        row.appendChild(dateCell);
        
        tableBody.appendChild(row);
    });
}

// Update project count display
function updateProjectCount() {
    projectCountElement.textContent = `${projectsData.length} projects loaded`;
}

// Hide loading indicator and show table
function hideLoading() {
    loadingElement.style.display = 'none';
    tableContainer.style.display = 'block';
}

// Show error message
function showError(error) {
    loadingElement.style.display = 'none';
    errorElement.style.display = 'block';
    console.error('Application error:', error);
}

// Export functions for potential external use
window.HeritageViewer = {
    loadProjects,
    sortTable,
    getCurrentData: () => projectsData,
    getCurrentSort: () => currentSort
};
