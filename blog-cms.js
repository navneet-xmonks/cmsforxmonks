#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class BlogCMS {
    constructor(isServerless = false) {
        this.blogsJsonPath = './blogs.json';
        this.templatePath = './coaching-black-white.html';
        this.imagesDir = './imagesofblog';
        this.blogsDir = './blogs';
        this.isServerless = isServerless;
        
        // Ensure directories exist (only in local environment)
        if (!this.isServerless) {
            this.ensureDirectories();
        }
        
        // Load existing blogs
        this.blogs = this.loadBlogs();
        
        // Setup readline interface (only in local environment)
        if (!this.isServerless) {
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
        }
    }

    ensureDirectories() {
        try {
            if (!fs.existsSync(this.imagesDir)) {
                fs.mkdirSync(this.imagesDir, { recursive: true });
            }
            if (!fs.existsSync(this.blogsDir)) {
                fs.mkdirSync(this.blogsDir, { recursive: true });
            }
        } catch (error) {
            if (!this.isServerless) {
                console.warn('Could not create directories:', error.message);
            }
        }
    }

    loadBlogs() {
        try {
            if (fs.existsSync(this.blogsJsonPath)) {
                const data = fs.readFileSync(this.blogsJsonPath, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading blogs.json:', error.message);
        }
        return [];
    }

    saveBlogs() {
        if (this.isServerless) {
            // In serverless environment, we can't save to disk
            // Return the updated blogs data for potential storage elsewhere
            return JSON.stringify(this.blogs, null, 4);
        }
        
        try {
            fs.writeFileSync(this.blogsJsonPath, JSON.stringify(this.blogs, null, 4));
            console.log('✅ blogs.json updated successfully!');
        } catch (error) {
            console.error('Error saving blogs.json:', error.message);
        }
    }

    loadTemplate() {
        try {
            return fs.readFileSync(this.templatePath, 'utf8');
        } catch (error) {
            console.error('Error loading template:', error.message);
            return null;
        }
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    formatDate(dateStr) {
        if (!dateStr) return new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        try {
            return new Date(dateStr).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        } catch {
            return dateStr;
        }
    }

    generateJsonLD(faqs, blogData = {}) {
        let jsonLD;
        
        if (faqs && faqs.length > 0) {
            // Generate FAQPage schema if FAQs exist
            jsonLD = {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": faqs.map(faq => ({
                    "@type": "Question",
                    "name": faq.question,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": faq.answer
                    }
                }))
            };
        } else {
            // Generate basic Article schema if no FAQs
            jsonLD = {
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": blogData.title || "Blog Post",
                "author": {
                    "@type": "Person",
                    "name": blogData.author || "xMonks"
                },
                "datePublished": blogData.date || new Date().toISOString().split('T')[0],
                "publisher": {
                    "@type": "Organization",
                    "name": "xMonks"
                }
            };
        }

        return `  <script type="application/ld+json">
  ${JSON.stringify(jsonLD, null, 4)}
  </script>`;
    }

    getJsonLD(customJsonLD, faqs, blogData) {
        if (customJsonLD && customJsonLD.trim()) {
            // Use custom JSON-LD provided by user
            console.log('🎯 Using custom JSON-LD from user input');
            try {
                // Validate JSON format
                JSON.parse(customJsonLD);
                return `  <script type="application/ld+json">
  ${customJsonLD}
  </script>`;
            } catch (error) {
                console.warn('⚠️  Invalid custom JSON-LD format, falling back to auto-generated');
                return this.generateJsonLD(faqs, blogData);
            }
        } else {
            // Use auto-generated JSON-LD
            console.log('🔧 Using auto-generated JSON-LD');
            return this.generateJsonLD(faqs, blogData);
        }
    }

    generateFAQsHTML(faqs) {
        if (!faqs || faqs.length === 0) return '';
        
        let faqsHTML = `    <section id="faqs" class="faq-section">
      <h2>FAQs</h2>
      <div class="accordion" id="faqAccordion">`;

        faqs.forEach((faq, index) => {
            const isFirst = index === 0;
            faqsHTML += `
        <div class="accordion-item">
          <h2 class="accordion-header" id="faqHeading${index + 1}">
            <button class="accordion-button${isFirst ? '' : ' collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#faqCollapse${index + 1}" aria-expanded="${isFirst}" aria-controls="faqCollapse${index + 1}">
              ${faq.question}
            </button>
          </h2>
          <div id="faqCollapse${index + 1}" class="accordion-collapse collapse${isFirst ? ' show' : ''}" aria-labelledby="faqHeading${index + 1}" data-bs-parent="#faqAccordion">
            <div class="accordion-body">
              ${faq.answer}
            </div>
          </div>
        </div>`;
        });

        faqsHTML += `
      </div>
    </section>`;
        
        return faqsHTML;
    }

    generateSectionHTML(sections, contentImage) {
        let sectionsHTML = '';
        let imageInserted = false;
        
        sections.forEach((section, index) => {
            const sectionId = section.id || (section.title ? section.title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-') : `section-${index}`);
            
            sectionsHTML += `    <section id="${sectionId}" class="blog-section">
`;
            
            // Only add h2 if section has a title
            if (section.title && section.title.trim()) {
                sectionsHTML += `      <h2>${section.title}</h2>
`;
            }
            
            if (section.subsections && section.subsections.length > 0) {
                section.subsections.forEach((subsection, subIndex) => {
                    // Add extra spacing before first h3 if there's a main h2
                    if (subIndex === 0 && section.title && section.title.trim()) {
                        sectionsHTML += `      <br>
`;
                    }
                    sectionsHTML += `      <h3>${subsection.title}</h3>
      ${this.renderContentHTML(subsection.content)}`;
                });
            } else if (section.content) {
                sectionsHTML += `      ${this.renderContentHTML(section.content)}`;
            }
            
            sectionsHTML += `    </section>`;
            
            // Insert content image after first or second section
            if (!imageInserted && index === Math.floor(sections.length / 2) && contentImage && contentImage.name) {
                sectionsHTML += `    <img class="blog-image" src="./imagesofblog/${contentImage.name}" alt="${contentImage.alt || 'Blog Content Image'}">
`;
                imageInserted = true;
            }
        });
        
        return sectionsHTML;
    }

    renderContentHTML(content) {
        if (!content) return '';
        
        // If content already contains HTML paragraph tags, use it as-is but ensure proper formatting
        if (content.includes('<p>') || content.includes('<strong>') || content.includes('<em>') || 
            content.includes('<b>') || content.includes('<i>') || content.includes('<a>') ||
            content.includes('<ul>') || content.includes('<ol>') || content.includes('<li>')) {
            // Content has HTML formatting, ensure proper indentation
            const lines = content.split('\n');
            const formattedLines = lines.map(line => line.trim() ? `      ${line.trim()}` : '');
            return formattedLines.join('\n');
        } else {
            // Plain text content, wrap in paragraph with proper indentation
            return `      <p>${content}</p>`;
        }
    }

    createBlogHTML(blogData) {
        const template = this.loadTemplate();
        if (!template) return null;

        const {
            title,
            category,
            author,
            date,
            sections,
            faqs,
            featureImage,
            contentImage,
            videoUrl,
            customJsonLD
        } = blogData;

        const formattedDate = this.formatDate(date);
        const jsonLD = this.getJsonLD(customJsonLD, faqs, { title, author, date });
        const sectionsHTML = this.generateSectionHTML(sections, contentImage);
        const faqsHTML = this.generateFAQsHTML(faqs);

        // Replace template placeholders
        let html = template
            .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
            .replace(/<span class="blog-meta-category">.*?<\/span>/, `<span class="blog-meta-category"><i class="fas fa-user-tie"></i> ${category}</span>`)
            .replace(/<span class="blog-meta-author">.*?<\/span>/, `<span class="blog-meta-author"><i class="fas fa-user"></i> ${author}</span>`)
            .replace(/<span class="blog-meta-date">.*?<\/span>/, `<span class="blog-meta-date"><i class="fas fa-calendar-alt"></i> ${formattedDate}</span>`)
            .replace(/<h1>.*?<\/h1>/, `<h1>${title}</h1>`);

        // Replace JSON-LD script (handle both with and without existing content)
        if (jsonLD && jsonLD.trim()) {
            console.log('🔧 Replacing JSON-LD in template...');
            html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, jsonLD);
        } else {
            console.log('⚠️  No JSON-LD generated');
        }

        // Replace main content sections (preserve two-column structure)
        const contentStart = html.indexOf('<div class="blog-main-content">');
        const videoStart = html.indexOf('<div class="blog-sticky-video">');
        const videoEnd = html.indexOf('</div>', videoStart);
        
        const beforeContent = html.substring(0, contentStart + '<div class="blog-main-content">'.length);
        const afterVideoDiv = html.substring(videoEnd + '</div>'.length);

        const newContent = `
${sectionsHTML}${faqsHTML}  </div>
  <div class="blog-sticky-video">
    <iframe width="560" height="315" src="${videoUrl || 'https://www.youtube.com/embed/9QZs51GUQ_Q?si=UD5JUqqZTKF1bi2v'}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
  </div>`;

        html = beforeContent + newContent + afterVideoDiv;

        return html;
    }

    async askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    async collectSections() {
        const sections = [];
        let addMore = true;
        
        console.log('\n📝 Adding blog sections...');
        
        while (addMore) {
            const sectionTitle = await this.askQuestion(`\nSection ${sections.length + 1} title: `);
            if (!sectionTitle) break;
            
            const hasSubsections = await this.askQuestion('Does this section have subsections? (y/n): ');
            
            const section = {
                title: sectionTitle,
                id: sectionTitle.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '-')
            };
            
            if (hasSubsections.toLowerCase() === 'y') {
                section.subsections = [];
                let addSubsection = true;
                
                while (addSubsection) {
                    const subTitle = await this.askQuestion(`  Subsection title: `);
                    if (!subTitle) break;
                    
                    const subContent = await this.askQuestion(`  Subsection content: `);
                    
                    section.subsections.push({
                        title: subTitle,
                        content: subContent
                    });
                    
                    const continueSubsections = await this.askQuestion('  Add another subsection? (y/n): ');
                    addSubsection = continueSubsections.toLowerCase() === 'y';
                }
            } else {
                section.content = await this.askQuestion('Section content: ');
            }
            
            sections.push(section);
            
            const contineSections = await this.askQuestion('Add another section? (y/n): ');
            addMore = contineSections.toLowerCase() === 'y';
        }
        
        return sections;
    }

    async collectFAQs() {
        const faqs = [];
        let addMore = true;
        
        console.log('\n❓ Adding FAQs...');
        
        while (addMore) {
            const question = await this.askQuestion(`\nFAQ ${faqs.length + 1} question: `);
            if (!question) break;
            
            const answer = await this.askQuestion('Answer: ');
            if (!answer) break;
            
            faqs.push({ question, answer });
            
            const continueFAQs = await this.askQuestion('Add another FAQ? (y/n): ');
            addMore = continueFAQs.toLowerCase() === 'y';
        }
        
        return faqs;
    }

    async createNewBlog() {
        console.log('🚀 Creating a new blog post...\n');
        
        try {
            // Collect basic information
            const title = await this.askQuestion('Blog title: ');
            if (!title) {
                console.log('❌ Title is required!');
                return;
            }
            
            const category = await this.askQuestion('Category: ');
            const author = await this.askQuestion('Author (default: xmonks): ') || 'xmonks';
            const date = await this.askQuestion('Date (YYYY-MM-DD, default: today): ') || new Date().toISOString().split('T')[0];
            
            // Image information
            const imageName = await this.askQuestion('Image filename (will be saved to ./imagesofblog/): ');
            const imageAlt = await this.askQuestion('Image alt text: ') || title;
            
            // Video information
            const videoUrl = await this.askQuestion('YouTube video URL (optional, default uses existing): ');
            
            // Collect sections
            const sections = await this.collectSections();
            if (sections.length === 0) {
                console.log('❌ At least one section is required!');
                return;
            }
            
            // Collect FAQs
            const faqs = await this.collectFAQs();
            
            // Generate slug and filename
            const slug = this.generateSlug(title);
            const filename = `${slug}.html`;
            const filePath = path.join(this.blogsDir, filename);
            
            // Create blog data
            const blogData = {
                title,
                category,
                author,
                date,
                sections,
                faqs,
                featureImage: {
                    name: imageName,
                    alt: imageAlt
                },
                contentImage: {
                    name: imageName, // Using same image for now in CLI
                    alt: imageAlt
                },
                videoUrl
            };
            
            // Generate HTML
            const html = this.createBlogHTML(blogData);
            if (!html) {
                console.log('❌ Failed to generate HTML');
                return;
            }
            
            // Save HTML file
            fs.writeFileSync(filePath, html);
            console.log(`✅ Blog HTML created: ${filePath}`);
            
                // Add to blogs.json
                const featureImageName = blogData.featureImage?.name || imageName;
                const blogEntry = {
                    title,
                    date: this.formatDate(date),
                    image: featureImageName ? `./blogs/imagesofblog/${featureImageName}` : "",
                    link: `./blogs/${filename}`,
                    category
                };            // Add to end of blogs array
            this.blogs.push(blogEntry);
            this.saveBlogs();
            
            console.log('\n🎉 Blog post created successfully!');
            console.log(`📁 HTML file: ${filePath}`);
            console.log(`🖼️  Remember to add your image to: ${this.imagesDir}/${imageName}`);
            console.log(`📋 Entry added to blogs.json`);
            
        } catch (error) {
            console.error('❌ Error creating blog:', error.message);
        }
    }

    async run() {
        console.log('🌟 Welcome to xMonks Blog CMS! 🌟\n');
        
        while (true) {
            console.log('\nOptions:');
            console.log('1. Create new blog post');
            console.log('2. List existing blogs');
            console.log('3. Exit');
            
            const choice = await this.askQuestion('\nChoose an option (1-3): ');
            
            switch (choice) {
                case '1':
                    await this.createNewBlog();
                    break;
                case '2':
                    this.listBlogs();
                    break;
                case '3':
                    console.log('👋 Goodbye!');
                    this.rl.close();
                    return;
                default:
                    console.log('❌ Invalid option. Please choose 1, 2, or 3.');
            }
        }
    }

    listBlogs() {
        console.log('\n📚 Existing Blogs:');
        console.log('==================');
        
        if (this.blogs.length === 0) {
            console.log('No blogs found.');
            return;
        }
        
        this.blogs.slice(0, 10).forEach((blog, index) => {
            console.log(`${index + 1}. ${blog.title}`);
            console.log(`   📅 ${blog.date} | 📂 ${blog.category || 'No category'}`);
            console.log(`   🔗 ${blog.link}`);
            console.log('');
        });
        
        if (this.blogs.length > 10) {
            console.log(`... and ${this.blogs.length - 10} more blogs`);
        }
    }
}

// Run the CMS
if (require.main === module) {
    const cms = new BlogCMS();
    cms.run().catch(console.error);
}

module.exports = BlogCMS;
