// Add imports for pdf-lib components
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// API Configuration - Replace with your actual API endpoints
// const API_CONFIG = {
//     deepseekApiKey: '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', // Replace with actual key
//     kimiApiKey: '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', // Replace with actual key
//     apiBaseUrl: '/api' // Use a proxy endpoint to hide API keys
// };

class LegalAnalyzer {
    constructor() {
        this.initializeElements();
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.conversationHistory = []; // Initialize conversation history for chat model
        this.legalAnalysisData = null; // To store analysis JSON for PDF generation
        this.plainExplanationData = null; // To store plain text/markdown for PDF generation
    }

    initializeElements() {
        // Get DOM elements
        this.uploadBox = document.getElementById('upload-box');
        this.fileInput = document.getElementById('file-input');
        this.uploadBtn = document.getElementById('upload-btn');
        this.textInput = document.getElementById('text-input');
        this.analyzeTextBtn = document.getElementById('analyze-text-btn');
        
        this.uploadSection = document.getElementById('upload-section');
        this.processingSection = document.getElementById('processing-section');
        this.resultsSection = document.getElementById('results-section');
        
        this.progressFill = document.getElementById('progress-fill');
        this.processingStep = document.querySelector('.processing-step');
        
        this.legalAnalysis = document.getElementById('legal-analysis');
        this.plainExplanation = document.getElementById('plain-explanation');
        
        this.downloadBtn = document.getElementById('download-btn');
        this.newAnalysisBtn = document.getElementById('new-analysis-btn');
    }

    setupEventListeners() {
        // File upload
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Text analysis
        this.analyzeTextBtn.addEventListener('click', () => this.analyzeText());
        
        // Download report
        this.downloadBtn.addEventListener('click', () => this.downloadReport());
        
        // New analysis
        this.newAnalysisBtn.addEventListener('click', () => this.resetAnalyzer());
    }

    setupDragAndDrop() {
        this.uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadBox.classList.add('dragover');
        });

        this.uploadBox.addEventListener('dragleave', () => {
            this.uploadBox.classList.remove('dragover');
        });

        this.uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadBox.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        });
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            await this.processFile(file);
        }
    }

    async processFile(file) {
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        
        if (!allowedTypes.includes(file.type)) {
            alert('Please upload a PDF, DOCX, or TXT file.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert('File size must be less than 10MB.');
            return;
        }

        try {
            this.updateProgress(10, 'Extracting text from document...');
            const text = await this.extractTextFromFile(file);
            
            if (text.includes("PDF text extraction requires robust server-side processing")) {
                alert("Please paste your document text directly or use a TXT/DOCX file. Full PDF text extraction is complex on the client-side.");
                this.resetAnalyzer();
                return;
            }

            await this.analyzeDocument(text);
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file. Please try again.');
            this.resetAnalyzer();
        }
    }

    async extractTextFromFile(file) {
        const fileType = file.type;
        
        if (fileType === 'text/plain') {
            return await file.text();
        } else if (fileType === 'application/pdf') {
            return await this.extractPdfText(file);
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            return await this.extractDocxText(file);
        }
    }

    async extractPdfText(file) {
        // Using pdf-lib for PDF validation - Note: pdf-lib is for manipulating/creating PDFs, not robust text extraction.
        // For robust text extraction, a server-side solution or a more specialized client-side library would be needed.
        // This placeholder message will inform the user about the limitation.
        const { PDFDocument } = await import('pdf-lib');
        const arrayBuffer = await file.arrayBuffer();
        
        try {
            await PDFDocument.load(arrayBuffer); // Validate PDF
            return 'PDF text extraction requires robust server-side processing. Please paste your document text directly or use a TXT/DOCX file for analysis.';
        } catch (error) {
            throw new Error('Unable to read PDF file. It might be corrupted or not a valid PDF.');
        }
    }

    async extractDocxText(file) {
        // Using mammoth for DOCX text extraction
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        
        try {
            const result = await mammoth.extractRawText({ arrayBuffer });
            return result.value;
        } catch (error) {
            throw new Error('Unable to extract text from DOCX file. It might be corrupted or not a valid DOCX.');
        }
    }

    async analyzeText() {
        const text = this.textInput.value.trim();
        if (!text) {
            alert('Please enter some text to analyze.');
            return;
        }
        
        await this.analyzeDocument(text);
    }

    async analyzeDocument(text) {
        this.showProcessing();
        
        try {
            // Step 1: Legal Analysis
            this.updateProgress(20, 'Analyzing legal content with AI...');
            // Store the analysis results in class properties
            this.legalAnalysisData = await this.getLegalAnalysis(text);
            
            // Step 2: Plain English Explanation
            this.updateProgress(60, 'Converting analysis to plain English...');
            this.plainExplanationData = await this.getPlainExplanation(this.legalAnalysisData);
            
            // Step 3: Display Results
            this.updateProgress(100, 'Finalizing report...');
            setTimeout(() => {
                this.displayResults(this.legalAnalysisData, this.plainExplanationData);
            }, 500);
            
        } catch (error) {
            console.error('Analysis error:', error);
            alert('Error analyzing document. Please try again. The document might be too large or the content too complex for analysis.');
            this.resetAnalyzer();
        }
    }

    async getLegalAnalysis(text) {
        const systemMessage = `You are an expert legal analyst. Your task is to analyze legal documents and extract key information.
Respond directly with JSON, following this JSON schema, and no other text.
{
  "keyClauses": string[],
  "risksRedFlags": string[],
  "missingTerms": string[],
  "obligations": {
    "client": string[],
    "contractor": string[]
  },
  "terminationConditions": string[],
  "liabilityDamages": string[]
}
Each array should contain concise, bullet-point like summaries. If a category is not applicable or found, use an empty array.`;

        const userPrompt = `Analyze the following legal document:

Document text:
${text}

Provide the analysis strictly in the specified JSON format.`;

        this.conversationHistory = [
            { role: "system", content: systemMessage },
            { role: "user", content: userPrompt }
        ];

        try {
            const completion = await websim.chat.completions.create({
                messages: this.conversationHistory,
                json: true,
                model: "deepseek-coder" // Using DeepSeek as per original prompt for analysis
            });

            const rawContent = completion.content;
            return JSON.parse(rawContent);
        } catch (error) {
            console.error("Error calling DeepSeek API for legal analysis:", error);
            throw new Error("Failed to get legal analysis from AI. Please try again.");
        }
    }

    async getPlainExplanation(legalAnalysisJson) {
        const systemMessage = `You are a helpful assistant specialized in simplifying complex legal information.
Convert the provided structured legal analysis into simple, easy-to-understand language for a non-legal audience.
Use clear, concise bullet points and avoid jargon. Explain practical implications where relevant.
Structure the output using markdown, with headings and lists.`;

        const userPrompt = `Convert the following legal analysis into plain English:

${JSON.stringify(legalAnalysisJson, null, 2)}`; // Pass the JSON structure as text

        this.conversationHistory = [ // Start new conversation for this specific task
            { role: "system", content: systemMessage },
            { role: "user", content: userPrompt }
        ];

        try {
            const completion = await websim.chat.completions.create({
                messages: this.conversationHistory,
                model: "glm-4" // Using Kimi (glm-4) as per original prompt for plain explanation
            });

            return completion.content;
        } catch (error) {
            console.error("Error calling Kimi API for plain explanation:", error);
            throw new Error("Failed to get plain English explanation from AI. Please try again.");
        }
    }

    updateProgress(percentage, step) {
        this.progressFill.style.width = percentage + '%';
        this.processingStep.textContent = step;
    }

    showProcessing() {
        this.uploadSection.classList.add('hidden');
        this.resultsSection.classList.add('hidden');
        this.processingSection.classList.remove('hidden');
    }

    displayResults(legalAnalysisJson, plainExplanationText) {
        this.processingSection.classList.add('hidden');
        this.resultsSection.classList.remove('hidden');
        
        // Display Legal Analysis
        this.legalAnalysis.innerHTML = this.formatLegalAnalysis(legalAnalysisJson);
        // Display Plain Explanation - use markdown formatting
        this.plainExplanation.innerHTML = this.markdownToHtml(plainExplanationText);
        
        // Scroll to results
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    formatLegalAnalysis(analysis) {
        let html = '';

        if (analysis.keyClauses && analysis.keyClauses.length > 0) {
            html += '<h3>KEY CLAUSES IDENTIFIED:</h3><ul>';
            analysis.keyClauses.forEach(item => html += `<li>${item}</li>`);
            html += '</ul>';
        }

        if (analysis.risksRedFlags && analysis.risksRedFlags.length > 0) {
            html += '<h3>RISKS & RED FLAGS:</h3><ul>';
            // Keeping HTML display of the warning icon as it's not affected by pdf-lib
            analysis.risksRedFlags.forEach(item => html += `<li class="warning">⚠️ ${item}</li>`);
            html += '</ul>';
        }
        
        if (analysis.missingTerms && analysis.missingTerms.length > 0) {
            html += '<h3>MISSING STANDARD TERMS:</h3><ul>';
            analysis.missingTerms.forEach(item => html += `<li>${item}</li>`);
            html += '</ul>';
        }

        if (analysis.obligations) {
            if (analysis.obligations.client && analysis.obligations.client.length > 0) {
                html += '<h3>CLIENT OBLIGATIONS:</h3><ul>';
                analysis.obligations.client.forEach(item => html += `<li>${item}</li>`);
                html += '</ul>';
            }
            if (analysis.obligations.contractor && analysis.obligations.contractor.length > 0) {
                html += '<h3>CONTRACTOR OBLIGATIONS:</h3><ul>';
                analysis.obligations.contractor.forEach(item => html += `<li>${item}</li>`);
                html += '</ul>';
            }
        }
        
        if (analysis.terminationConditions && analysis.terminationConditions.length > 0) {
            html += '<h3>TERMINATION CONDITIONS:</h3><ul>';
            analysis.terminationConditions.forEach(item => html += `<li>${item}</li>`);
            html += '</ul>';
        }

        if (analysis.liabilityDamages && analysis.liabilityDamages.length > 0) {
            html += '<h3>LIABILITY & DAMAGES:</h3><ul>';
            analysis.liabilityDamages.forEach(item => html += `<li>${item}</li>`);
            html += '</ul>';
        }

        return html || '<p>No analysis available for this document.</p>';
    }

    // Basic Markdown to HTML converter
    markdownToHtml(markdown) {
        let html = markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/^\+ (.*$)/gim, '<li>$1</li>');
        
        // Convert lists
        html = html.replace(/(<li>.*<\/li>(\n|.)*?)(?!<li>)/gim, '<ul>$1</ul>');

        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                   .replace(/_(.*?)_/g, '<em>$1</em>');
        
        html = html.replace(/\n/g, '<br>'); // Convert remaining newlines to br

        return html;
    }

    async downloadReport() {
        if (!this.legalAnalysisData || !this.plainExplanationData) {
            alert('No analysis report available to download. Please analyze a document first.');
            return;
        }

        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage();
        
        // Use a Unicode-compatible font for proper character rendering
        const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

        const fontSize = 10;
        const lineHeight = 14;
        const margin = 50;
        let y = page.getHeight() - margin;
        const pageHeight = page.getHeight();
        const pageWidth = page.getWidth();
        const contentWidth = pageWidth - 2 * margin;

        // Helper function to draw text with basic wrapping and page handling
        const drawTextWrapped = (text, options = {}) => {
            let currentY = options.y !== undefined ? options.y : y;
            const currentFont = options.font || font;
            const currentFontSize = options.fontSize || fontSize;
            const currentLineHeight = options.lineHeight || lineHeight;
            const currentX = options.x || margin;
            const color = options.color || rgb(0, 0, 0);

            const words = text.split(' ');
            let line = [];
            let currentLineText = '';

            for (const word of words) {
                const testLine = currentLineText === '' ? word : `${currentLineText} ${word}`;
                const testLineLength = currentFont.widthOfTextAtSize(testLine, currentFontSize);

                if (testLineLength > contentWidth && currentLineText !== '') {
                    // Draw current accumulated line if it exceeds width and is not empty
                    page.drawText(currentLineText, { x: currentX, y: currentY, font: currentFont, size: currentFontSize, color });
                    currentY -= currentLineHeight;
                    currentLineText = word; // Start new line with the current word
                } else {
                    currentLineText = testLine; // Add word to current line
                }

                if (currentY < margin + currentLineHeight) { // Check if new page is needed soon
                    page = pdfDoc.addPage();
                    currentY = pageHeight - margin;
                    // Redraw the start of the current line if it was split across pages
                    if (currentLineText !== '') {
                        page.drawText(currentLineText, { x: currentX, y: currentY, font: currentFont, size: currentFontSize, color });
                        currentY -= currentLineHeight;
                        currentLineText = ''; // Clear as it's drawn
                    }
                }
            }
            // Draw any remaining text in currentLineText
            if (currentLineText !== '') {
                page.drawText(currentLineText, { x: currentX, y: currentY, font: currentFont, size: currentFontSize, color });
                currentY -= currentLineHeight;
            }

            return currentY; // Return the new y position
        };

        // --- Report Header ---
        y = drawTextWrapped('LEGAL DOCUMENT ANALYSIS REPORT', { y: y, font: titleFont, fontSize: 18, lineHeight: 22, x: margin, color: rgb(0.1, 0.2, 0.7) });
        y = drawTextWrapped(`Generated by LegalAI on ${new Date().toLocaleDateString()}`, { y: y, font: font, fontSize: 10, lineHeight: 12, x: margin, color: rgb(0.5, 0.5, 0.5) });
        y -= lineHeight * 2; // Add some space

        // --- Legal Analysis Section ---
        y = drawTextWrapped('=== LEGAL ANALYSIS ===', { y: y, font: boldFont, fontSize: 14, lineHeight: 18, x: margin });
        y -= lineHeight;

        const analysis = this.legalAnalysisData;

        const drawSection = (title, items, isWarning = false, indent = 0) => {
            if (items && items.length > 0) {
                if (y < margin + lineHeight * 3 && pdfDoc.getPages().length > 0) { // Check if new page is needed before new section
                    page = pdfDoc.addPage();
                    y = pageHeight - margin;
                }
                y = drawTextWrapped(`${title}:`, { y: y, font: boldFont, fontSize: 12, lineHeight: 16, x: margin + indent });
                y -= lineHeight * 0.5; // Small space after title
                items.forEach(item => {
                    const prefix = isWarning ? '(Warning) ' : '• '; // Changed '⚠️ ' to '(Warning) ' to avoid WinAnsi encoding error
                    y = drawTextWrapped(`${prefix}${item}`, { y: y, font: font, fontSize: fontSize, lineHeight: lineHeight, x: margin + indent + 10, color: isWarning ? rgb(0.7, 0.1, 0.1) : rgb(0, 0, 0) });
                });
                y -= lineHeight; // Space after section
            }
        };
        
        drawSection('KEY CLAUSES IDENTIFIED', analysis.keyClauses);
        drawSection('RISKS & RED FLAGS', analysis.risksRedFlags, true);
        drawSection('MISSING STANDARD TERMS', analysis.missingTerms);

        if (analysis.obligations) {
            if (analysis.obligations.client && analysis.obligations.client.length > 0) {
                drawSection('CLIENT OBLIGATIONS', analysis.obligations.client);
            }
            if (analysis.obligations.contractor && analysis.obligations.contractor.length > 0) {
                drawSection('CONTRACTOR OBLIGATIONS', analysis.obligations.contractor);
            }
        }
        
        drawSection('TERMINATION CONDITIONS', analysis.terminationConditions);
        drawSection('LIABILITY & DAMAGES', analysis.liabilityDamages);

        // Ensure enough space for next section header or new page
        if (y < margin + lineHeight * 3) {
            page = pdfDoc.addPage();
            y = pageHeight - margin;
        }
        y -= lineHeight; // Space before next main section


        // --- Plain English Explanation Section ---
        y = drawTextWrapped('=== PLAIN ENGLISH EXPLANATION ===', { y: y, font: boldFont, fontSize: 14, lineHeight: 18, x: margin });
        y -= lineHeight;
        
        const plainTextLines = this.plainExplanationData.split('\n');
        for (const line of plainTextLines) {
            let processedLine = line.trim();
            let currentFont = font;
            let currentFontSize = fontSize;
            let currentLineHeight = lineHeight;
            let currentX = margin;
            let color = rgb(0, 0, 0);

            // Basic Markdown interpretation for PDF
            if (processedLine.startsWith('### ')) {
                processedLine = processedLine.substring(4).trim();
                currentFont = boldFont;
                currentFontSize = fontSize + 2;
                currentLineHeight = lineHeight + 2;
            } else if (processedLine.startsWith('## ')) {
                processedLine = processedLine.substring(3).trim();
                currentFont = boldFont;
                currentFontSize = fontSize + 4;
                currentLineHeight = lineHeight + 4;
            } else if (processedLine.startsWith('# ')) {
                processedLine = processedLine.substring(2).trim();
                currentFont = boldFont;
                currentFontSize = fontSize + 6;
                currentLineHeight = lineHeight + 6;
            } else if (processedLine.startsWith('* ') || processedLine.startsWith('- ')) {
                processedLine = '• ' + processedLine.substring(2).trim(); // Unicode bullet
                currentX = margin + 10; // Indent lists
            } else if (processedLine.startsWith('**') && processedLine.endsWith('**')) { // Basic bold
                processedLine = processedLine.slice(2, -2).trim();
                currentFont = boldFont;
            } else if (processedLine.startsWith('_') && processedLine.endsWith('_')) { // Basic italic (represented by regular font here)
                processedLine = processedLine.slice(1, -1).trim();
                currentFont = font; // No italic standard font in basic TimesRoman
            }

            if (processedLine) {
                y = drawTextWrapped(processedLine, { y: y, font: currentFont, fontSize: currentFontSize, lineHeight: currentLineHeight, x: currentX, color: color });
            } else {
                y -= lineHeight * 0.5; // Smaller spacing for empty lines in markdown
            }

            if (y < margin + lineHeight * 2) { // Ensure space for next line or new page
                page = pdfDoc.addPage();
                y = pageHeight - margin;
            }
        }
        
        y -= lineHeight * 2; // Add some space before footer disclaimer

        // --- Footer Disclaimer ---
        y = drawTextWrapped('---', { y: y, font: font, fontSize: 8, lineHeight: 10, x: margin, color: rgb(0.5, 0.5, 0.5) });
        y = drawTextWrapped('This analysis is provided by AI and does not constitute legal advice. Please consult with a qualified attorney for legal matters.', { y: y, font: font, fontSize: 8, lineHeight: 10, x: margin, color: rgb(0.5, 0.5, 0.5) });

        // Build and save the PDF document
        const pdfBytes = await pdfDoc.save();

        // Create a Blob and URL for downloading
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'legal-analysis-report.pdf'; // Change to .pdf
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up the object URL
        URL.revokeObjectURL(url);
    }

    resetAnalyzer() {
        this.uploadSection.classList.remove('hidden');
        this.processingSection.classList.add('hidden');
        this.resultsSection.classList.add('hidden');
        
        this.fileInput.value = '';
        this.textInput.value = '';
        this.progressFill.style.width = '0%';
        this.legalAnalysis.innerHTML = '';
        this.plainExplanation.innerHTML = '';
        
        this.legalAnalysisData = null; // Clear stored data on reset
        this.plainExplanationData = null; // Clear stored data on reset

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LegalAnalyzer();
});

// Add some CSS for the formatted content
const additionalStyles = `
.warning {
    background: #fef2f2;
    border-left: 4px solid #ef4444;
    padding: 0.5rem;
    margin: 0.5rem 0;
    border-radius: 0 4px 4px 0;
}

.bullet-point {
    margin-left: 1rem;
    margin-bottom: 0.25rem;
}

.panel-content h1, .panel-content h2, .panel-content h3, .panel-content h4 {
    color: #1e293b;
    margin: 1.5rem 0 0.8rem 0;
    font-size: 1.2rem;
}

.panel-content h4 {
    color: #374151;
    margin: 1rem 0 0.5rem 0;
    font-size: 1.1rem;
}

.panel-content ul {
    list-style-type: none;
    padding-left: 0;
    margin-bottom: 1rem;
}

.panel-content ul li {
    position: relative;
    padding-left: 1.5rem;
    margin-bottom: 0.5rem;
}

.panel-content ul li::before {
    content: '•';
    color: #2563eb;
    position: absolute;
    left: 0;
    top: 0;
}
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);