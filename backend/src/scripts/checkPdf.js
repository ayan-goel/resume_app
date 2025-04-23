/**
 * Script to check if a PDF can be properly parsed
 * Used to identify problematic PDFs that might cause 500 errors
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

// Process command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: node checkPdf.js <pdf-file-path>');
  process.exit(1);
}

const pdfPath = args[0];

// Check if file exists
if (!fs.existsSync(pdfPath)) {
  console.error(`File not found: ${pdfPath}`);
  process.exit(1);
}

console.log(`Checking PDF: ${pdfPath}`);
console.log(`File size: ${(fs.statSync(pdfPath).size / 1024).toFixed(2)} KB`);

// Load and parse the PDF
async function checkPdf() {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    console.log('File loaded successfully');
    
    // Setup a timeout to catch hangs
    const timeout = setTimeout(() => {
      console.error('PDF parsing timed out after 30 seconds');
      process.exit(1);
    }, 30000);
    
    // Parse the PDF
    console.log('Starting PDF parsing...');
    const pdfData = await pdfParse(dataBuffer);
    clearTimeout(timeout);
    
    console.log('PDF parsed successfully');
    console.log(`Number of pages: ${pdfData.numpages}`);
    console.log(`Text content length: ${pdfData.text.length} characters`);
    
    // Check if text is empty
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      console.error('WARNING: PDF contains no extractable text');
      console.log('This PDF might be an image-only PDF or have content protection');
    } else {
      // Show a preview of the text
      console.log('\nText preview (first 500 chars):');
      console.log('-----------------------------------');
      console.log(pdfData.text.substring(0, 500) + '...');
      console.log('-----------------------------------');
    }
    
    console.log('\nPDF CHECK PASSED: This PDF can be parsed correctly');
  } catch (error) {
    console.error('\nPDF CHECK FAILED: Error parsing PDF');
    console.error('Error details:', error);
    console.error('\nThis PDF would likely cause errors in the upload process');
    process.exit(1);
  }
}

checkPdf(); 