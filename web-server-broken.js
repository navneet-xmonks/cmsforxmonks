#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const BlogCMS = require('./blog-cms');

class WebCMSServer {
    constructor(port = 3000) {
        this.port = port;
        this.cms = new BlogCMS();
        this.server = http.createServer(this.handleRequest.bind(this));
        
        console.log('🌟 xMonks Blog CMS Web Server 🌟');
        console.log('=====================================');
    }

    // Simple multipart form data parser
    parseMultipartData(buffer, boundary) {
        const parts = {};
        const files = {};
        
        const boundaryBuffer = Buffer.from(`--${boundary}`);
        const sections = [];
        let start = 0;
        
        // Find all boundary positions
        while (start < buffer.length) {
            const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
            if (boundaryIndex === -1) break;
            
            if (start !== 0) {
                sections.push(buffer.slice(start, boundaryIndex));
            }
            start = boundaryIndex + boundaryBuffer.length;
        }
        
        // Parse each section
        sections.forEach(section => {
            if (section.length === 0) return;
            
            // Find the double CRLF that separates headers from content
            const headerEnd = section.indexOf('\r\n\r\n');
            if (headerEnd === -1) return;
            
            const headers = section.slice(0, headerEnd).toString();
            const content = section.slice(headerEnd + 4);
            
            // Parse Content-Disposition header
            const nameMatch = headers.match(/name="([^"]+)"/);
            const filenameMatch = headers.match(/filename="([^"]+)"/);
            
            if (nameMatch) {
                const fieldName = nameMatch[1];
                
                if (filenameMatch && filenameMatch[1]) {
                    // This is a file
                    files[fieldName] = {
                        filename: filenameMatch[1],
                        data: content.slice(0, -2) // Remove trailing CRLF
                    };
                } else {
                    // This is a regular field
                    parts[fieldName] = content.slice(0, -2).toString(); // Remove trailing CRLF
                }
            }
        });
        
        return { fields: parts, files: files };
    }

    handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;
        const method = req.method;

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        try {
            if (pathname === '/' || pathname === '/frontend.html') {
                this.serveFrontend(res);
            } else if (pathname === '/api/create-blog' && method === 'POST') {
                this.handleCreateBlog(req, res);
            } else if (pathname === '/api/blogs' && method === 'GET') {
                this.handleGetBlogs(res);
            } else if (pathname.startsWith('/blogs/')) {
                this.serveStaticFile(req, res);
            } else if (pathname.startsWith('/imagesofblog/')) {
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

    async handleCreateBlog(req, res) {
        const contentType = req.headers['content-type'] || '';
        
        if (contentType.includes('multipart/form-data')) {
            // Handle file upload
            const boundary = contentType.split('boundary=')[1];
            let bodyBuffer = Buffer.alloc(0);
            
            req.on('data', chunk => {
                bodyBuffer = Buffer.concat([bodyBuffer, chunk]);
            });

            req.on('end', async () => {
                try {
                    const { fields, files } = this.parseMultipartData(bodyBuffer, boundary);
                    
                    // Ensure images directory exists
                    const imagesDir = './imagesofblog';
                    if (!fs.existsSync(imagesDir)) {
                        fs.mkdirSync(imagesDir, { recursive: true });
                    }
                    
                    // Save uploaded images
                    if (files.featureImageFile && files.featureImageFile.filename) {
                        const featureImagePath = path.join(imagesDir, files.featureImageFile.filename);
                        fs.writeFileSync(featureImagePath, files.featureImageFile.data);
                        console.log(`✅ Feature image saved: ${featureImagePath}`);
                    }
                    
                    if (files.contentImageFile && files.contentImageFile.filename) {
                        const contentImagePath = path.join(imagesDir, files.contentImageFile.filename);
                        fs.writeFileSync(contentImagePath, files.contentImageFile.data);
                        console.log(`✅ Content image saved: ${contentImagePath}`);
                    }
                    
                    // Build blog data from form fields
                    const blogData = {
                        title: fields.title,
                        category: fields.category,
                        author: fields.author || 'xmonks',
                        date: fields.date,
                        videoUrl: fields.videoUrl,
                        featureImage: {
                            name: fields.featureImageName,
                            alt: fields.featureImageAlt || fields.title
                        },
                        contentImage: {
                            name: fields.contentImageName,
                            alt: fields.contentImageAlt || 'Blog content image'
                        },
                        sections: [],
                        faqs: []
                    };
                    
                    // Parse sections
                    let sectionIndex = 0;
                    while (fields[`sections[${sectionIndex}][title]`]) {
                        const section = {
                            title: fields[`sections[${sectionIndex}][title]`] || '',
                            content: fields[`sections[${sectionIndex}][content]`] || '',
                            subsections: []
                        };
                        
                        // Parse subsections for this section
                        let subIndex = 0;
                        while (fields[`sections[${sectionIndex}][subsections][${subIndex}][title]`]) {
                            section.subsections.push({
                                title: fields[`sections[${sectionIndex}][subsections][${subIndex}][title]`] || '',
                                content: fields[`sections[${sectionIndex}][subsections][${subIndex}][content]`] || ''
                            });
                            subIndex++;
                        }
                        
                        blogData.sections.push(section);
                        sectionIndex++;
                    }
                    
                    // Parse FAQs
                    let faqIndex = 0;
                    while (fields[`faqs[${faqIndex}][question]`]) {
                        blogData.faqs.push({
                            question: fields[`faqs[${faqIndex}][question]`] || '',
                            answer: fields[`faqs[${faqIndex}][answer]`] || ''
                        });
                        faqIndex++;
                    }
                    
                    await this.processBlogData(blogData, res);
                    
                } catch (error) {
                    console.error('Error processing multipart data:', error);
                    this.send500(res, 'Error processing form data');
                }
            });
        } else {
            // Handle JSON data (backward compatibility)
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
                    this.send500(res, 'Invalid JSON data');
                }
            });
        }
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
                const featureImageName = blogData.featureImage?.name;
                const blogEntry = {
                    title: blogData.title,
                    date: this.cms.formatDate(blogData.date),
                    image: featureImageName ? `./imagesofblog/${featureImageName}` : "",
                    link: `./blogs/${filename}`,
                    category: blogData.category
                };

                this.cms.blogs.unshift(blogEntry);
                this.cms.saveBlogs();

                // Send success response
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Blog post created successfully!',
                    filename: filename,
                    path: filePath
                }));

                console.log(`✅ Blog created: ${filename}`);
                
            } catch (error) {
                console.error('Error creating blog:', error);
                this.sendError(res, 'Failed to create blog post');
            }
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

            const ext = path.extname(filePath);
            const contentTypes = {
                '.html': 'text/html',
                '.css': 'text/css',
                '.js': 'application/javascript',
                '.json': 'application/json',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml'
            };

            const contentType = contentTypes[ext] || 'application/octet-stream';
            
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(res);
            
        } catch (error) {
            this.send500(res, error.message);
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
            <head><title>404 - Not Found</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                <h1>404 - Not Found</h1>
                <p>The requested resource was not found.</p>
                <a href="/">← Back to CMS</a>
            </body>
            </html>
        `);
    }

    send500(res, message) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
            <html>
            <head><title>500 - Server Error</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
                <h1>500 - Server Error</h1>
                <p>${message}</p>
                <a href="/">← Back to CMS</a>
            </body>
            </html>
        `);
    }

    start() {
        this.server.listen(this.port, () => {
            console.log(`🚀 Server running at http://localhost:${this.port}`);
            console.log(`📝 Frontend available at http://localhost:${this.port}/frontend.html`);
            console.log(`📊 API endpoint: http://localhost:${this.port}/api/create-blog`);
            console.log(`\n🎯 Usage:`);
            console.log(`   1. Open http://localhost:${this.port} in your browser`);
            console.log(`   2. Fill out the blog form`);
            console.log(`   3. Click "Create Blog Post"`);
            console.log(`   4. Your blog will be generated automatically!`);
            console.log(`\n📁 Generated files will be saved to:`);
            console.log(`   - HTML: ./blogs/your-blog-slug.html`);
            console.log(`   - Updated: ./blogs.json`);
            console.log(`\n🛑 Press Ctrl+C to stop the server`);
        });

        // Handle server shutdown gracefully
        process.on('SIGINT', () => {
            console.log('\n\n👋 Shutting down server...');
            this.server.close(() => {
                console.log('✅ Server closed successfully');
                process.exit(0);
            });
        });
    }
}

// Start the server
if (require.main === module) {
    const port = process.argv[2] || 3000;
    const server = new WebCMSServer(port);
    server.start();
}

module.exports = WebCMSServer;
