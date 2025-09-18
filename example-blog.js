#!/usr/bin/env node

// Example script showing how to use the BlogCMS programmatically
const BlogCMS = require('./blog-cms');

async function createExampleBlog() {
    const cms = new BlogCMS();
    
    // Example blog data
    const exampleBlogData = {
        title: "The Future of Leadership: Embracing AI and Human Connection",
        category: "Leadership",
        author: "xmonks",
        date: "2025-09-15",
        sections: [
            {
                title: "Introduction to Modern Leadership",
                content: "In today's rapidly evolving business landscape, leadership is undergoing a fundamental transformation. The integration of artificial intelligence and the need for authentic human connection create both opportunities and challenges for modern leaders."
            },
            {
                title: "The AI Revolution in Leadership",
                subsections: [
                    {
                        title: "Data-Driven Decision Making",
                        content: "Leaders now have access to unprecedented amounts of data. AI tools can analyze patterns, predict outcomes, and provide insights that were previously impossible to obtain. This enables more informed and strategic decision-making processes."
                    },
                    {
                        title: "Automation and Delegation",
                        content: "AI can handle routine tasks, freeing leaders to focus on strategic thinking, relationship building, and creative problem-solving. This shift requires leaders to redefine their role and value proposition."
                    }
                ]
            },
            {
                title: "Maintaining Human Connection",
                content: "Despite technological advances, the human element remains crucial in leadership. Emotional intelligence, empathy, and authentic communication cannot be replaced by AI and become even more valuable in a digital world."
            },
            {
                title: "Building Future-Ready Teams",
                subsections: [
                    {
                        title: "Developing AI Literacy",
                        content: "Leaders must ensure their teams understand AI capabilities and limitations. This includes providing training and creating a culture of continuous learning and adaptation."
                    },
                    {
                        title: "Fostering Innovation",
                        content: "Creating environments where both human creativity and AI capabilities can thrive requires thoughtful leadership. This involves balancing structure with flexibility and encouraging experimentation."
                    }
                ]
            }
        ],
        faqs: [
            {
                question: "How can leaders prepare for AI integration in their organizations?",
                answer: "Leaders should start by educating themselves about AI capabilities, assessing their organization's readiness, and developing a strategic implementation plan. This includes investing in training, updating processes, and maintaining open communication with teams about changes."
            },
            {
                question: "What leadership skills become more important in an AI-driven world?",
                answer: "Emotional intelligence, creative thinking, strategic vision, and the ability to manage change become increasingly valuable. Leaders who can bridge the gap between technology and human needs will be most successful."
            },
            {
                question: "How do you balance automation with human employment?",
                answer: "Successful leaders focus on augmenting human capabilities rather than replacing them. This involves retraining employees, creating new roles that leverage uniquely human skills, and maintaining a people-first approach to technological adoption."
            }
        ],
        imageInfo: {
            name: "future-leadership-ai.jpg",
            alt: "Modern leader using AI technology while maintaining human connections"
        },
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?si=example123"
    };
    
    // Generate HTML
    const html = cms.createBlogHTML(exampleBlogData);
    
    if (html) {
        // Save the example blog
        const fs = require('fs');
        const path = require('path');
        
        const filename = cms.generateSlug(exampleBlogData.title) + '.html';
        const filePath = path.join('./blogs', filename);
        
        // Ensure blogs directory exists
        if (!fs.existsSync('./blogs')) {
            fs.mkdirSync('./blogs', { recursive: true });
        }
        
        fs.writeFileSync(filePath, html);
        console.log(`✅ Example blog created: ${filePath}`);
        
        // Add to blogs.json
        cms.blogs.unshift({
            title: exampleBlogData.title,
            date: cms.formatDate(exampleBlogData.date),
            image: `./imagesofblog/${exampleBlogData.imageInfo.name}`,
            link: `./blogs/${filename}`,
            category: exampleBlogData.category
        });
        
        cms.saveBlogs();
        
        console.log('📝 Example blog entry added to blogs.json');
        console.log(`🖼️  Don't forget to add the image: ./imagesofblog/${exampleBlogData.imageInfo.name}`);
    } else {
        console.error('❌ Failed to create example blog');
    }
}

// Run the example
if (require.main === module) {
    createExampleBlog().catch(console.error);
}

module.exports = { createExampleBlog };
