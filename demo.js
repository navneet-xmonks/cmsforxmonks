#!/usr/bin/env node

// Quick demo script for the CMS
const fs = require('fs');

console.log('🌟 xMonks Blog CMS - Quick Demo 🌟\n');

console.log('📁 Current Directory Structure:');
console.log('===============================');

const files = fs.readdirSync('.');
files.forEach(file => {
    const stats = fs.statSync(file);
    const icon = stats.isDirectory() ? '📁' : '📄';
    console.log(`${icon} ${file}`);
});

console.log('\n📚 Recent Blogs (from blogs.json):');
console.log('=====================================');

try {
    const blogs = JSON.parse(fs.readFileSync('./blogs.json', 'utf8'));
    blogs.slice(0, 5).forEach((blog, index) => {
        console.log(`${index + 1}. ${blog.title}`);
        console.log(`   📅 ${blog.date} | 📂 ${blog.category || 'No category'}`);
        console.log(`   🔗 ${blog.link}`);
        console.log('');
    });
} catch (error) {
    console.log('❌ Could not read blogs.json');
}

console.log('🚀 To start the CMS, run:');
console.log('   node blog-cms.js');
console.log('   or');
console.log('   ./blog-cms.js');

console.log('\n📖 To view the README:');
console.log('   cat README.md');

console.log('\n🎯 Example usage:');
console.log('   node example-blog.js  # Creates a sample blog');

console.log('\n📂 Generated Files:');
console.log('   ✅ blog-cms.js         # Main CMS script');
console.log('   ✅ package.json        # Node.js project config');
console.log('   ✅ README.md           # Complete documentation');
console.log('   ✅ example-blog.js     # Example usage script');

if (fs.existsSync('./blogs')) {
    const blogFiles = fs.readdirSync('./blogs');
    console.log(`   ✅ ./blogs/            # ${blogFiles.length} blog files`);
}

if (fs.existsSync('./imagesofblog')) {
    const imageFiles = fs.readdirSync('./imagesofblog');
    console.log(`   ✅ ./imagesofblog/     # ${imageFiles.length} image files`);
}

console.log('\n🎉 Your CMS is ready to use!');
console.log('Happy blogging! 📝✨');
