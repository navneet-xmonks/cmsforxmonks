const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');
const { IncomingForm } = require('formidable');
const mammoth = require('mammoth');
const archiver = require('archiver');
const BlogCMS = require('./blog-cms');

class WebCMSServer {
    constructor(port = process.env.PORT || 3000) {
        this.port = port;
        this.cms = new BlogCMS();
        this.server = http.createServer(this.handleRequest.bind(this));
        
        console.log('🌟 xMonks Blog CMS Web Server 🌟');
        console.log('=====================================');
    }

    handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        const method = req.method;

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        try {
            if (method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
            } else if (pathname === '/' || pathname === '/frontend.html') {
                this.serveFrontend(res);
            } else if (pathname === '/modern' || pathname === '/modern-frontend.html') {
                this.serveModernFrontend(res);
            } else if (pathname === '/api/create-blog' && method === 'POST') {
                this.handleCreateBlog(req, res);
            } else if (pathname === '/api/create-blog-wysiwyg' && method === 'POST') {
                this.handleCreateBlogWysiwyg(req, res);
            } else if (pathname === '/api/parse-docx' && method === 'POST') {
                this.handleParseDocx(req, res);
            } else if (pathname === '/api/blogs' && method === 'GET') {
                this.handleGetBlogs(res);
            } else if (pathname === '/api/download-blog' && method === 'GET') {
                this.handleDownloadBlog(req, res);
            } else if (pathname.startsWith('/blogs/') || pathname.startsWith('/imagesofblog/')) {
                this.serveStaticFile(req, res);
            } else if (pathname.endsWith('.css') || pathname.endsWith('.js')) {
                this.serveStaticFile(req, res);
            } else {
                this.send404(res);
            }
        } catch (error) {
            console.error('Server error:', error);
            this.send500(res, error.message);
        }
    }

    serveFrontend(res) {
        try {
            const frontendPath = path.join(__dirname, 'frontend.html');
            const html = fs.readFileSync(frontendPath, 'utf8');
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } catch (error) {
            this.send500(res, 'Could not load frontend');
        }
    }

    serveModernFrontend(res) {
        try {
            const frontendPath = path.join(__dirname, 'modern-frontend.html');
            const html = fs.readFileSync(frontendPath, 'utf8');
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } catch (error) {
            this.send500(res, 'Could not load modern frontend');
        }
    }

    async handleCreateBlog(req, res) {
        const contentType = req.headers['content-type'] || '';
        
        if (contentType.includes('application/json')) {
            // Handle JSON data (current frontend approach)
            let body = '';
            
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', async () => {
                try {
                    const blogData = JSON.parse(body);
                    await this.processBlogData(blogData, res);
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    this.sendError(res, 'Invalid JSON data');
                }
            });
        } else if (contentType.includes('multipart/form-data')) {
            // Handle multipart form data (for file uploads)
            const form = new IncomingForm({
                uploadDir: './imagesofblog',
                keepExtensions: true,
                maxFileSize: 10 * 1024 * 1024, // 10MB limit
            });

            // Ensure upload directory exists
            if (!fs.existsSync('./imagesofblog')) {
                fs.mkdirSync('./imagesofblog', { recursive: true });
            }

            form.parse(req, async (err, fields, files) => {
                if (err) {
                    console.error('Form parsing error:', err);
                    return this.sendError(res, 'Error parsing form data');
                }

                try {
                    // Handle file uploads
                    const featureImageFile = files.featureImageFile;
                    const contentImageFile = files.contentImageFile;

                    let featureImageName = '';
                    let contentImageName = '';

                    // Handle feature image
                    if (featureImageFile) {
                        const file = Array.isArray(featureImageFile) ? featureImageFile[0] : featureImageFile;
                        if (file && file.originalFilename) {
                            featureImageName = file.originalFilename;
                            if (file.filepath) {
                                const newPath = path.join('./imagesofblog', featureImageName);
                                fs.renameSync(file.filepath, newPath);
                                console.log(`✅ Feature image saved: ${featureImageName}`);
                            }
                        }
                    }

                    // Handle content image
                    if (contentImageFile) {
                        const file = Array.isArray(contentImageFile) ? contentImageFile[0] : contentImageFile;
                        if (file && file.originalFilename) {
                            contentImageName = file.originalFilename;
                            if (file.filepath) {
                                const newPath = path.join('./imagesofblog', contentImageName);
                                fs.renameSync(file.filepath, newPath);
                                console.log(`✅ Content image saved: ${contentImageName}`);
                            }
                        }
                    }

                    // Build blog data from form fields
                    const blogData = {
                        title: Array.isArray(fields.title) ? fields.title[0] : fields.title,
                        category: Array.isArray(fields.category) ? fields.category[0] : fields.category,
                        author: Array.isArray(fields.author) ? fields.author[0] : fields.author || 'xmonks',
                        date: Array.isArray(fields.date) ? fields.date[0] : fields.date,
                        videoUrl: Array.isArray(fields.videoUrl) ? fields.videoUrl[0] : fields.videoUrl,
                        customJsonLD: Array.isArray(fields.jsonLD) ? fields.jsonLD[0] : fields.jsonLD,
                        featureImage: {
                            name: featureImageName || (Array.isArray(fields.featureImageName) ? fields.featureImageName[0] : fields.featureImageName),
                            alt: Array.isArray(fields.featureImageAlt) ? fields.featureImageAlt[0] : fields.featureImageAlt || 'Feature image'
                        },
                        contentImage: {
                            name: contentImageName || (Array.isArray(fields.contentImageName) ? fields.contentImageName[0] : fields.contentImageName),
                            alt: Array.isArray(fields.contentImageAlt) ? fields.contentImageAlt[0] : fields.contentImageAlt || 'Content image'
                        },
                        sections: [],
                        faqs: []
                    };

                    // Parse sections
                    let sectionIndex = 0;
                    while (fields[`sections[${sectionIndex}][title]`]) {
                        const sectionTitle = Array.isArray(fields[`sections[${sectionIndex}][title]`]) ? 
                            fields[`sections[${sectionIndex}][title]`][0] : 
                            fields[`sections[${sectionIndex}][title]`];
                        
                        const sectionContent = Array.isArray(fields[`sections[${sectionIndex}][content]`]) ? 
                            fields[`sections[${sectionIndex}][content]`][0] : 
                            fields[`sections[${sectionIndex}][content]`];

                        const section = {
                            title: sectionTitle || '',
                            content: sectionContent || '',
                            subsections: []
                        };

                        // Parse subsections for this section
                        let subIndex = 0;
                        while (fields[`sections[${sectionIndex}][subsections][${subIndex}][title]`]) {
                            const subTitle = Array.isArray(fields[`sections[${sectionIndex}][subsections][${subIndex}][title]`]) ? 
                                fields[`sections[${sectionIndex}][subsections][${subIndex}][title]`][0] : 
                                fields[`sections[${sectionIndex}][subsections][${subIndex}][title]`];
                            
                            const subContent = Array.isArray(fields[`sections[${sectionIndex}][subsections][${subIndex}][content]`]) ? 
                                fields[`sections[${sectionIndex}][subsections][${subIndex}][content]`][0] : 
                                fields[`sections[${sectionIndex}][subsections][${subIndex}][content]`];

                            section.subsections.push({
                                title: subTitle || '',
                                content: subContent || ''
                            });
                            subIndex++;
                        }

                        blogData.sections.push(section);
                        sectionIndex++;
                    }

                    // Parse FAQs
                    let faqIndex = 0;
                    while (fields[`faqs[${faqIndex}][question]`]) {
                        const question = Array.isArray(fields[`faqs[${faqIndex}][question]`]) ? 
                            fields[`faqs[${faqIndex}][question]`][0] : 
                            fields[`faqs[${faqIndex}][question]`];
                        
                        const answer = Array.isArray(fields[`faqs[${faqIndex}][answer]`]) ? 
                            fields[`faqs[${faqIndex}][answer]`][0] : 
                            fields[`faqs[${faqIndex}][answer]`];

                        blogData.faqs.push({
                            question: question || '',
                            answer: answer || ''
                        });
                        faqIndex++;
                    }

                    // Process the blog data
                    await this.processBlogData(blogData, res);

                } catch (error) {
                    console.error('Error processing blog data:', error);
                    this.sendError(res, 'Error processing blog data');
                }
            });
        } else {
            // Unsupported content type
            this.sendError(res, 'Unsupported content type. Use application/json or multipart/form-data');
        }
    }

    async handleParseDocx(req, res) {
        try {
            // Use system temp directory for GCP compatibility
            const tempDir = os.tmpdir();
            
            const form = new IncomingForm({
                uploadDir: tempDir,
                keepExtensions: true,
                maxFileSize: 50 * 1024 * 1024, // 50MB limit
            });

            // No need to create temp directory - os.tmpdir() always exists

            form.parse(req, async (err, fields, files) => {
                if (err) {
                    console.error('Form parsing error:', err);
                    return this.sendError(res, 'Error parsing form data');
                }

                try {
                    const docxFile = files.docxFile;
                    const file = Array.isArray(docxFile) ? docxFile[0] : docxFile;
                    
                    if (!file || !file.filepath) {
                        return this.sendError(res, 'No DOCX file uploaded');
                    }

                    // Track extracted images with base64 data for GCP compatibility
                    const extractedImages = [];
                    let imageCounter = 0;

                    // Custom image converter to handle images as base64 (serverless-friendly)
                    const options = {
                        convertImage: mammoth.images.imgElement(function(image) {
                            imageCounter++;
                            const extension = image.contentType.split('/')[1] || 'png';
                            const fileName = `extracted-image-${Date.now()}-${imageCounter}.${extension}`;
                            
                            // Convert image to base64 for serverless environment
                            return image.read().then(function(imageBuffer) {
                                const base64 = imageBuffer.toString('base64');
                                const mimeType = image.contentType || 'image/png';
                                const dataUri = `data:${mimeType};base64,${base64}`;
                                
                                extractedImages.push({
                                    fileName: fileName,
                                    base64: base64,
                                    mimeType: mimeType,
                                    dataUri: dataUri
                                });
                                console.log(`📸 Extracted image: ${fileName} (${Math.round(imageBuffer.length / 1024)}KB)`);
                                
                                // Return img tag with data URI
                                return {
                                    src: dataUri,
                                    alt: `Extracted image ${imageCounter}`
                                };
                            });
                        })
                    };

                    // Parse DOCX with mammoth (get both HTML and plain text)
                    const htmlResult = await mammoth.convertToHtml({ path: file.filepath }, options);
                    const textResult = await mammoth.extractRawText({ path: file.filepath });
                    const html = htmlResult.value;
                    const plainText = textResult.value;
                    
                    // Extract title (first h1 or strong text)
                    let title = '';
                    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i) || html.match(/<strong[^>]*>(.*?)<\/strong>/i);
                    if (titleMatch) {
                        title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
                    }

                    // Parse sections (h2, h3 elements)
                    const sections = [];
                    const sectionRegex = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
                    let match;
                    while ((match = sectionRegex.exec(html)) !== null) {
                        const level = parseInt(match[1]);
                        const sectionTitle = match[2].replace(/<[^>]*>/g, '').trim();
                        
                        if (level === 2) {
                            sections.push({
                                title: sectionTitle,
                                content: '',
                                subsections: []
                            });
                        } else if (level === 3 && sections.length > 0) {
                            sections[sections.length - 1].subsections.push({
                                title: sectionTitle,
                                content: ''
                            });
                        }
                    }

                    // Try to extract JSON-LD if present
                    let jsonLD = '';
                    const jsonLDMatch = html.match(/{[^}]*"@context"[^}]*"schema\.org"[^}]*}/gi);
                    if (jsonLDMatch) {
                        jsonLD = jsonLDMatch[0];
                    }

                    // Clean up temp file
                    if (fs.existsSync(file.filepath)) {
                        fs.unlinkSync(file.filepath);
                    }

                    // Send response
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        success: true,
                        title: title,
                        html: html,
                        content: plainText, // Add plain text content for smart parsing
                        sections: sections,
                        jsonLD: jsonLD,
                        extractedImages: extractedImages, // List of extracted image objects with base64
                        featureImage: extractedImages[0] ? extractedImages[0].dataUri : '', // First image as feature
                        contentImage: extractedImages[1] ? extractedImages[1].dataUri : '', // Second image as content
                        imageCount: extractedImages.length, // Number of images found
                        messages: htmlResult.messages
                    }));

                } catch (error) {
                    console.error('Error parsing DOCX:', error);
                    this.sendError(res, 'Error parsing DOCX file');
                }
            });

        } catch (error) {
            console.error('Error handling DOCX upload:', error);
            this.sendError(res, 'Error processing DOCX upload');
        }
    }

    async handleCreateBlogWysiwyg(req, res) {
        try {
            const form = new IncomingForm({
                uploadDir: './imagesofblog',
                keepExtensions: true,
                maxFileSize: 10 * 1024 * 1024, // 10MB limit
            });

            // Ensure upload directory exists
            if (!fs.existsSync('./imagesofblog')) {
                fs.mkdirSync('./imagesofblog', { recursive: true });
            }

            form.parse(req, async (err, fields, files) => {
                if (err) {
                    console.error('Form parsing error:', err);
                    return this.sendError(res, 'Error parsing form data');
                }

                try {
                    // Handle file uploads (same as before)
                    const featureImageFile = files.featureImageFile;
                    const contentImageFile = files.contentImageFile;

                    let featureImageName = '';
                    let contentImageName = '';

                    // Handle feature image
                    if (featureImageFile) {
                        const file = Array.isArray(featureImageFile) ? featureImageFile[0] : featureImageFile;
                        if (file && file.originalFilename) {
                            featureImageName = file.originalFilename;
                            if (file.filepath) {
                                const newPath = path.join('./imagesofblog', featureImageName);
                                fs.renameSync(file.filepath, newPath);
                                console.log(`✅ Feature image saved: ${featureImageName}`);
                            }
                        }
                    }

                    // Handle content image
                    if (contentImageFile) {
                        const file = Array.isArray(contentImageFile) ? contentImageFile[0] : contentImageFile;
                        if (file && file.originalFilename) {
                            contentImageName = file.originalFilename;
                            if (file.filepath) {
                                const newPath = path.join('./imagesofblog', contentImageName);
                                fs.renameSync(file.filepath, newPath);
                                console.log(`✅ Content image saved: ${contentImageName}`);
                            }
                        }
                    }

                    // Get title and content
                    const wysiwygContent = Array.isArray(fields.wysiwygContent) ? fields.wysiwygContent[0] : fields.wysiwygContent;
                    const blogTitle = Array.isArray(fields.title) ? fields.title[0] : fields.title;
                    
                    // Parse WYSIWYG content into sections (exclude title duplication)
                    const sections = this.parseWysiwygContent(wysiwygContent, blogTitle);

                    // Build blog data
                    const blogData = {
                        title: blogTitle,
                        category: Array.isArray(fields.category) ? fields.category[0] : fields.category,
                        author: Array.isArray(fields.author) ? fields.author[0] : fields.author || 'xmonks',
                        date: Array.isArray(fields.date) ? fields.date[0] : fields.date,
                        videoUrl: Array.isArray(fields.videoUrl) ? fields.videoUrl[0] : fields.videoUrl,
                        customJsonLD: Array.isArray(fields.jsonLD) ? fields.jsonLD[0] : fields.jsonLD,
                        featureImage: {
                            name: featureImageName || (Array.isArray(fields.featureImageName) ? fields.featureImageName[0] : fields.featureImageName),
                            alt: Array.isArray(fields.featureImageAlt) ? fields.featureImageAlt[0] : fields.featureImageAlt || 'Feature image'
                        },
                        contentImage: {
                            name: contentImageName || (Array.isArray(fields.contentImageName) ? fields.contentImageName[0] : fields.contentImageName),
                            alt: Array.isArray(fields.contentImageAlt) ? fields.contentImageAlt[0] : fields.contentImageAlt || 'Content image'
                        },
                        sections: sections,
                        faqs: []
                    };

                    // Parse FAQs
                    let faqIndex = 0;
                    while (fields[`faqs[${faqIndex}][question]`]) {
                        const question = Array.isArray(fields[`faqs[${faqIndex}][question]`]) ? 
                            fields[`faqs[${faqIndex}][question]`][0] : 
                            fields[`faqs[${faqIndex}][question]`];
                        
                        const answer = Array.isArray(fields[`faqs[${faqIndex}][answer]`]) ? 
                            fields[`faqs[${faqIndex}][answer]`][0] : 
                            fields[`faqs[${faqIndex}][answer]`];

                        blogData.faqs.push({
                            question: question || '',
                            answer: answer || ''
                        });
                        faqIndex++;
                    }

                    // Process the blog data
                    await this.processBlogData(blogData, res);

                } catch (error) {
                    console.error('Error processing WYSIWYG blog data:', error);
                    this.sendError(res, 'Error processing blog data');
                }
            });

        } catch (error) {
            console.error('Error handling WYSIWYG create blog:', error);
            this.sendError(res, 'Error creating blog post');
        }
    }

    parseWysiwygContent(htmlContent, blogTitle = '') {
        if (!htmlContent) return [];
        
        const sections = [];
        let currentSection = null;
        let firstHeadingSkipped = false;
        
        // Split content by headers
        const parts = htmlContent.split(/(<h[1-6][^>]*>.*?<\/h[1-6]>)/gi);
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i].trim();
            if (!part) continue;
            
            // Check if this is a header
            const headerMatch = part.match(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/i);
            if (headerMatch) {
                const level = parseInt(headerMatch[1]);
                const title = headerMatch[2].replace(/<[^>]*>/g, '').trim();
                
                // Skip first heading if it matches the blog title (to avoid duplication)
                if (!firstHeadingSkipped && blogTitle && title.toLowerCase() === blogTitle.toLowerCase()) {
                    firstHeadingSkipped = true;
                    console.log(`🚫 Skipping duplicate title heading: "${title}"`);
                    continue;
                }
                firstHeadingSkipped = true;
                
                if (level === 1 || level === 2) {
                    // Main section
                    currentSection = {
                        title: title,
                        content: '',
                        subsections: []
                    };
                    sections.push(currentSection);
                } else if (level >= 3 && currentSection) {
                    // Subsection
                    currentSection.subsections.push({
                        title: title,
                        content: ''
                    });
                }
            } else if (part) {
                // Content - ensure we have a section to add it to
                if (!currentSection) {
                    // Create a default section without generic title
                    currentSection = {
                        title: '', // Empty title to avoid showing "Content" header
                        content: '',
                        subsections: []
                    };
                    sections.push(currentSection);
                }
                
                // Add content to appropriate section (preserve formatting tags)
                if (currentSection.subsections.length > 0) {
                    // Add to last subsection
                    const lastSub = currentSection.subsections[currentSection.subsections.length - 1];
                    lastSub.content += (lastSub.content ? ' ' : '') + this.preserveFormatting(part);
                } else {
                    // Add to main section
                    currentSection.content += (currentSection.content ? ' ' : '') + this.preserveFormatting(part);
                }
            }
        }
        
        // If no sections were created but we have content, create a default section without generic title
        if (sections.length === 0 && htmlContent.trim()) {
            const cleanContent = this.preserveFormatting(htmlContent);
            if (cleanContent) {
                sections.push({
                    title: '', // Empty title to avoid showing "Content" header
                    content: cleanContent,
                    subsections: []
                });
            }
        }
        
        return sections;
    }

    preserveFormatting(htmlContent) {
        // Keep important formatting tags while removing structural/layout tags
        return htmlContent
            // Remove unwanted structural tags but preserve their content
            .replace(/<\/?(?:div|span|section|article|aside|nav|header|footer|main)[^>]*>/gi, '')
            .replace(/<\/?(?:meta|link|script|style|head|html|body|title)[^>]*>/gi, '')
            .replace(/<\/?(?:table|tr|td|th|thead|tbody|tfoot)[^>]*>/gi, '')
            // Keep text formatting tags
            // Strong/bold: <strong>, <b>
            // Emphasis/italic: <em>, <i>
            // Underline: <u>
            // Links: <a>
            // Lists: <ul>, <ol>, <li>
            // Line breaks: <br>
            // Paragraphs: <p> (but we'll handle them specially)
            .replace(/<p[^>]*>/gi, '<p>')  // Normalize paragraph tags
            .trim();
    }

    async processBlogData(blogData, res) {
        try {
            // Validate required fields
            if (!blogData.title) {
                return this.sendError(res, 'Title is required');
            }
            
            if (!blogData.category) {
                return this.sendError(res, 'Category is required');
            }

            if (!blogData.sections || blogData.sections.length === 0) {
                return this.sendError(res, 'At least one section is required');
            }

            // Ensure image objects exist with default values
            if (!blogData.featureImage) {
                blogData.featureImage = { name: '', alt: '' };
            }
            if (!blogData.contentImage) {
                blogData.contentImage = { name: '', alt: '' };
            }

            // Set defaults
            blogData.author = blogData.author || 'xmonks';
            blogData.date = blogData.date || new Date().toISOString().split('T')[0];
            
            // Generate HTML
            const html = this.cms.createBlogHTML(blogData);
            if (!html) {
                return this.sendError(res, 'Failed to generate HTML');
            }

            // Generate filename and save
            const slug = this.cms.generateSlug(blogData.title);
            const filename = `${slug}.html`;
            const filePath = path.join('./blogs', filename);
            
            // Ensure blogs directory exists
            if (!fs.existsSync('./blogs')) {
                fs.mkdirSync('./blogs', { recursive: true });
            }
            
            fs.writeFileSync(filePath, html);

            // Add to blogs.json
            const featureImageName = blogData.featureImage?.name || '';
            const blogEntry = {
                title: blogData.title,
                date: this.cms.formatDate(blogData.date),
                image: featureImageName ? `./blogs/imagesofblog/${featureImageName}` : "",
                link: `./blogs/${filename}`,
                category: blogData.category
            };

            this.cms.blogs.push(blogEntry);
            this.cms.saveBlogs();

            // Send success response with download info
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: 'Blog post created successfully!',
                filename: filename,
                path: filePath,
                featureImage: featureImageName || 'none',
                contentImage: blogData.contentImage?.name || 'none',
                downloadUrl: `/api/download-blog?filename=${encodeURIComponent(filename)}&featureImage=${encodeURIComponent(featureImageName || '')}&contentImage=${encodeURIComponent(blogData.contentImage?.name || '')}`
            }));

            console.log(`✅ Blog created: ${filename}`);
            console.log(`🖼️  Feature image: ${featureImageName || 'none'}`);
            console.log(`🖼️  Content image: ${blogData.contentImage?.name || 'none'}`);
            
        } catch (error) {
            console.error('Error creating blog:', error);
            this.sendError(res, 'Failed to create blog post');
        }
    }

    handleGetBlogs(res) {
        try {
            const blogs = this.cms.blogs.slice(0, 20); // Return latest 20 blogs
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                blogs: blogs,
                total: this.cms.blogs.length
            }));
        } catch (error) {
            this.sendError(res, error.message);
        }
    }

    handleDownloadBlog(req, res) {
        try {
            console.log('📦 Download request received:', req.url);
            
            const parsedUrl = url.parse(req.url, true);
            const query = parsedUrl.query;
            const filename = query.filename;
            const featureImage = query.featureImage;
            const contentImage = query.contentImage;

            console.log('📦 Download params:', { filename, featureImage, contentImage });

            if (!filename) {
                return this.sendError(res, 'Filename is required');
            }

            // Create ZIP file
            const archive = archiver('zip', {
                zlib: { level: 9 } // Best compression
            });

            // Set response headers for file download
            const zipFilename = `${filename.replace('.html', '')}-blog-package.zip`;
            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="${zipFilename}"`
            });

            // Handle archive events
            archive.on('error', (err) => {
                console.error('Archive error:', err);
                this.sendError(res, 'Error creating ZIP file');
            });

            archive.on('end', () => {
                console.log('📦 Archive completed successfully');
            });

            // Pipe archive to response
            archive.pipe(res);

            // Add blog HTML file
            const blogPath = path.join('./blogs', filename);
            if (fs.existsSync(blogPath)) {
                archive.file(blogPath, { name: filename });
            }

            // Add feature image if exists
            if (featureImage && featureImage !== '') {
                const featureImagePath = path.join('./imagesofblog', featureImage);
                if (fs.existsSync(featureImagePath)) {
                    archive.file(featureImagePath, { name: `images/${featureImage}` });
                }
            }

            // Add content image if exists and different from feature image
            if (contentImage && contentImage !== '' && contentImage !== featureImage) {
                const contentImagePath = path.join('./imagesofblog', contentImage);
                if (fs.existsSync(contentImagePath)) {
                    archive.file(contentImagePath, { name: `images/${contentImage}` });
                }
            }

            // Add blogs.json
            if (fs.existsSync('./blogs.json')) {
                archive.file('./blogs.json', { name: 'blogs.json' });
            }

            // Add README with instructions
            const readmeContent = `# Blog Package

This ZIP contains:
1. ${filename} - Your blog HTML file
2. images/ - All images used in the blog
3. blogs.json - Updated blog index

## Setup Instructions:
1. Extract all files
2. Place the HTML file in your blog directory
3. Place images in your images directory
4. Update your blog index with blogs.json

Generated by xMonks CMS - ${new Date().toISOString()}
`;
            
            archive.append(readmeContent, { name: 'README.md' });

            // Finalize archive
            archive.finalize();

            console.log(`📦 ZIP download created: ${zipFilename}`);

        } catch (error) {
            console.error('Error creating ZIP download:', error);
            this.sendError(res, 'Error creating download package');
        }
    }

    serveStaticFile(req, res) {
        const parsedUrl = url.parse(req.url);
        let filePath = path.join(__dirname, parsedUrl.pathname);
        
        // Security check
        if (filePath.indexOf(__dirname) !== 0) {
            return this.send404(res);
        }

        try {
            if (!fs.existsSync(filePath)) {
                return this.send404(res);
            }

            const stat = fs.statSync(filePath);
            if (!stat.isFile()) {
                return this.send404(res);
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentTypes = {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'application/javascript',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.webp': 'image/webp'
            };

            const contentType = contentTypes[ext] || 'application/octet-stream';
            
            res.writeHead(200, { 'Content-Type': contentType });
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            
        } catch (error) {
            this.send500(res, 'Error serving file');
        }
    }

    sendError(res, message) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: message
        }));
    }

    send404(res) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h1>404 - Not Found</h1>
                    <p>The requested resource could not be found.</p>
                    <a href="/">Go back to home</a>
                </body>
            </html>
        `);
    }

    send500(res, message) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            error: `Internal server error: ${message}`
        }));
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`🚀 Server running at http://localhost:${this.port}`);
            console.log(`📝 Frontend available at http://localhost:${this.port}/frontend.html`);
            console.log(`📊 API endpoint: http://localhost:${this.port}/api/create-blog`);
            console.log('\n🎯 Usage:');
            console.log('   1. Open http://localhost:3000 in your browser');
            console.log('   2. Fill out the blog form');
            console.log('   3. Upload your images');
            console.log('   4. Click "Create Blog Post"');
            console.log('   5. Your blog will be generated automatically!');
            console.log('\n📁 Generated files will be saved to:');
            console.log('   - HTML: ./blogs/your-blog-slug.html');
            console.log('   - Images: ./imagesofblog/');
            console.log('   - Updated: ./blogs.json');
            console.log('\n🛑 Press Ctrl+C to stop the server');
        });
    }
}

// Start the server
const port = process.env.PORT || 3000;
const server = new WebCMSServer(port);
server.start();

module.exports = WebCMSServer;
