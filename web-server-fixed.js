const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const formidable = require('formidable');
const BlogCMS = require('./blog-cms');

class WebCMSServer {
    constructor(port = 3000) {
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
            } else if (pathname === '/api/create-blog' && method === 'POST') {
                this.handleCreateBlog(req, res);
            } else if (pathname === '/api/blogs' && method === 'GET') {
                this.handleGetBlogs(res);
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

    async handleCreateBlog(req, res) {
        try {
            const form = formidable({
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

                    if (featureImageFile && featureImageFile[0]) {
                        const file = featureImageFile[0];
                        featureImageName = file.originalFilename;
                        const newPath = path.join('./imagesofblog', featureImageName);
                        fs.renameSync(file.filepath, newPath);
                        console.log(`✅ Feature image saved: ${featureImageName}`);
                    }

                    if (contentImageFile && contentImageFile[0]) {
                        const file = contentImageFile[0];
                        contentImageName = file.originalFilename;
                        const newPath = path.join('./imagesofblog', contentImageName);
                        fs.renameSync(file.filepath, newPath);
                        console.log(`✅ Content image saved: ${contentImageName}`);
                    }

                    // Build blog data from form fields
                    const blogData = {
                        title: Array.isArray(fields.title) ? fields.title[0] : fields.title,
                        category: Array.isArray(fields.category) ? fields.category[0] : fields.category,
                        author: Array.isArray(fields.author) ? fields.author[0] : fields.author || 'xmonks',
                        date: Array.isArray(fields.date) ? fields.date[0] : fields.date,
                        videoUrl: Array.isArray(fields.videoUrl) ? fields.videoUrl[0] : fields.videoUrl,
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

        } catch (error) {
            console.error('Error handling create blog:', error);
            this.sendError(res, 'Error creating blog post');
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
                path: filePath,
                featureImage: featureImageName,
                contentImage: blogData.contentImage?.name
            }));

            console.log(`✅ Blog created: ${filename}`);
            console.log(`🖼️  Feature image: ${featureImageName}`);
            console.log(`🖼️  Content image: ${blogData.contentImage?.name}`);
            
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
const server = new WebCMSServer(3000);
server.start();

module.exports = WebCMSServer;
