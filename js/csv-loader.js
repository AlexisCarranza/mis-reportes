/**
 * CSV Loader Module for Dynamic Report Data
 * Loads and parses CSV files for DevOps metrics and reports
 */

/**
 * Fetches CSV content from a given URL
 * @param {string} url - Path to the CSV file
 * @returns {Promise<string>} CSV text content
 */
async function fetchCSV(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Fetch failed, trying XMLHttpRequest:', error);
        // Fallback to XMLHttpRequest
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || xhr.status === 0) { // 0 for local files
                        resolve(xhr.responseText);
                    } else {
                        reject(new Error(`XHR error! status: ${xhr.status}`));
                    }
                }
            };
            xhr.onerror = function() {
                reject(new Error('Network error'));
            };
            xhr.send();
        });
    }
}

/**
 * Parses CSV text into an array of objects
 * Assumes first row is headers
 * @param {string} csvText - Raw CSV content
 * @returns {Array<Object>} Array of data objects
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV must have at least header and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length !== headers.length) {
            console.warn(`Skipping malformed row ${i + 1}: expected ${headers.length} columns, got ${values.length}`);
            continue;
        }

        const obj = {};
        headers.forEach((header, index) => {
            const value = values[index].trim();
            // Convert numeric strings to numbers
            obj[header] = isNaN(value) ? value : parseFloat(value);
        });
        data.push(obj);
    }

    return data;
}

/**
 * Validates that the parsed data has required schema for DevOps metrics
 * @param {Array<Object>} data - Parsed CSV data
 * @returns {Array<Object>} Validated data
 */
function validateSchema(data) {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No data found in CSV');
    }

    const requiredColumns = [
        'period', 'deploy_freq_per_week', 'lead_time_hrs',
        'change_failure_rate_pct', 'mttr_avg_min', 'dora_level'
    ];

    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !(col in firstRow));

    if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    return data;
}

/**
 * Loads and parses metrics from CSV file
 * @param {string} url - Path to the CSV file
 * @returns {Promise<Array<Object>>} Parsed and validated metrics data
 */
async function loadMetrics(url) {
    try {
        const csvText = await fetchCSV(url);
        const parsedData = parseCSV(csvText);
        return validateSchema(parsedData);
    } catch (error) {
        console.error('Error loading metrics:', error);
        throw error;
    }
}

// Export functions for use in other scripts
window.CSVLoader = {
    fetchCSV,
    parseCSV,
    validateSchema,
    loadMetrics
};