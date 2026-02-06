const fs = require('fs');

/**
 * PDF generator that works both locally and on Netlify
 * - Local: Uses system Chrome
 * - Netlify: Uses @sparticuz/chromium (serverless Chrome with all dependencies)
 */

const isNetlify = process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;

const getChromePath = () => {
  // On Netlify/AWS Lambda, @sparticuz/chromium provides the path
  if (isNetlify) {
    try {
      const chromium = require('@sparticuz/chromium');
      return chromium.executablePath;
    } catch (error) {
      console.error('@sparticuz/chromium not available:', error.message);
      throw new Error('PDF generation not available on this platform');
    }
  }
  
  // Local development - find Chrome on Windows
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  
  for (const chromePath of possiblePaths) {
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  
  throw new Error('Chrome/Edge not found. Please install Google Chrome.');
};

/**
 * Generate PDF from HTML using Chrome headless
 */
async function generatePdfFromHtml(htmlContent, options = {}) {
  // On Netlify, use puppeteer with chrome-aws-lambda
  if (isNetlify) {
    return await generatePdfNetlify(htmlContent, options);
  }
  
  // Local development - use system Chrome
  return await generatePdfLocal(htmlContent, options);
}

/**
 * Generate PDF on Netlify using @sparticuz/chromium
 */
async function generatePdfNetlify(htmlContent, options = {}) {
  try {
    const chromium = require('@sparticuz/chromium');
    const puppeteer = require('puppeteer-core');
    
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    await browser.close();
    return pdfBuffer;
    
  } catch (error) {
    console.error('Netlify PDF generation error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
}

/**
 * Generate PDF locally using system Chrome
 */
async function generatePdfLocal(htmlContent, options = {}) {
  const { spawn } = require('child_process');
  const path = require('path');
  const os = require('os');
  
  const chromePath = getChromePath();
  const tempHtmlFile = path.join(os.tmpdir(), `pdf-${Date.now()}.html`);
  const tempPdfFile = path.join(os.tmpdir(), `pdf-${Date.now()}.pdf`);
  
  try {
    // Write HTML to temp file
    fs.writeFileSync(tempHtmlFile, htmlContent, 'utf8');
    
    // Chrome headless print-to-pdf arguments
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--print-to-pdf=${tempPdfFile}`,
      `--print-to-pdf-no-header`,
      '--run-all-compositor-stages-before-draw',
      tempHtmlFile
    ];
    
    // Run Chrome
    await new Promise((resolve, reject) => {
      const chrome = spawn(chromePath, args);
      
      let stderr = '';
      chrome.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      chrome.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Chrome exited with code ${code}: ${stderr}`));
        }
      });
      
      chrome.on('error', reject);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        chrome.kill();
        reject(new Error('PDF generation timeout'));
      }, 30000);
    });
    
    // Read the generated PDF
    const pdfBuffer = fs.readFileSync(tempPdfFile);
    
    // Cleanup
    try {
      fs.unlinkSync(tempHtmlFile);
      fs.unlinkSync(tempPdfFile);
    } catch (e) {
      // Ignore cleanup errors
    }
    
    return pdfBuffer;
    
  } catch (error) {
    // Cleanup on error
    try {
      if (fs.existsSync(tempHtmlFile)) fs.unlinkSync(tempHtmlFile);
      if (fs.existsSync(tempPdfFile)) fs.unlinkSync(tempPdfFile);
    } catch (e) {
      // Ignore cleanup errors
    }
    throw error;
  }
}

module.exports = {
  generatePdfFromHtml,
  getChromePath
};
