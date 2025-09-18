# xMonks Blog CMS

A simple, interactive command-line Content Management System (CMS) for creating xMonks blog posts. This CMS automatically generates HTML files with the proper structure, updates the blogs.json file, and handles all the necessary components like JSON-LD schema, FAQs, and sections.

## Features

- ✅ **Interactive CLI**: Easy-to-use command-line interface
- ✅ **Template-based**: Uses existing blog structure as template
- ✅ **JSON-LD Generation**: Automatically creates structured data for SEO
- ✅ **FAQ Support**: Built-in FAQ accordion generation
- ✅ **Section Management**: Support for sections and subsections
- ✅ **Image Handling**: Consistent image path management (`./imagesofblog/`)
- ✅ **blogs.json Updates**: Automatically updates the blog index
- ✅ **Slug Generation**: Creates SEO-friendly URLs
- ✅ **Category Support**: Organizes blogs by categories

## Installation

1. **Clone or navigate to your project directory**:
   ```bash
   cd "/Users/xmonks/Desktop/xmonks websites & projects/cmsforxmonks"
   ```

2. **Make the script executable** (optional):
   ```bash
   chmod +x blog-cms.js
   ```

## Usage

### Quick Start

Run the CMS:
```bash
node blog-cms.js
```

Or if you made it executable:
```bash
./blog-cms.js
```

### Menu Options

1. **Create new blog post**: Interactive blog creation wizard
2. **List existing blogs**: View your current blog posts
3. **Exit**: Close the CMS

### Creating a New Blog

When you select "Create new blog post", the CMS will ask for:

1. **Basic Information**:
   - Blog title
   - Category (e.g., Leadership, Wellness, Self Development)
   - Author (defaults to "xmonks")
   - Date (defaults to today)

2. **Image Information**:
   - Image filename (will be stored in `./imagesofblog/`)
   - Alt text for accessibility

3. **Sections**:
   - Section titles
   - Choose between simple sections or sections with subsections
   - Content for each section/subsection
   - Add as many sections as needed

4. **FAQs**:
   - Question and answer pairs
   - Automatically generates Bootstrap accordion
   - Creates JSON-LD schema for SEO

## File Structure

After creating a blog, the following files are generated/updated:

```
project-root/
├── blog-cms.js              # The CMS script
├── package.json             # Node.js project configuration
├── blogs.json               # Updated with new blog entry
├── blogs/
│   └── your-blog-slug.html  # Generated HTML file
├── imagesofblog/
│   └── your-image.jpg       # Place your images here
└── coaching-black-white.html # Template file (existing)
```

## Blog Structure

Each generated blog includes:

- **HTML Head**: Title, meta tags, JSON-LD schema
- **Header Section**: Category badge, author, date, main H1 title
- **Main Content**: Organized sections with proper HTML structure
- **Image**: Automatically placed in the middle of content
- **FAQs**: Bootstrap accordion with structured data
- **Footer**: Standard xMonks footer

## Example Workflow

1. **Start the CMS**:
   ```bash
   node blog-cms.js
   ```

2. **Choose option 1** to create a new blog

3. **Fill in the details**:
   ```
   Blog title: How to Build Effective Leadership Teams
   Category: Leadership
   Author: xmonks
   Date: 2025-09-15
   Image filename: leadership-teams.jpg
   Image alt text: Team of leaders collaborating
   ```

4. **Add sections**:
   ```
   Section 1 title: Introduction to Leadership Teams
   Section content: Leadership teams are the backbone...
   
   Section 2 title: Building Trust and Communication
   Does this section have subsections? y
     Subsection title: Establishing Trust
     Subsection content: Trust is built through...
   ```

5. **Add FAQs**:
   ```
   FAQ 1 question: What makes a leadership team effective?
   Answer: Effective leadership teams share common goals...
   ```

6. **Files generated**:
   - `./blogs/how-to-build-effective-leadership-teams.html`
   - `blogs.json` updated with new entry
   - Remember to add `leadership-teams.jpg` to `./imagesofblog/`

## Features in Detail

### JSON-LD Schema
Automatically generates structured data for FAQs:
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [...]
}
```

### SEO-Friendly URLs
- Converts titles to slugs: "How to Build Teams" → "how-to-build-teams"
- Removes special characters and normalizes spacing

### Bootstrap Integration
- Uses existing Bootstrap classes and components
- Responsive design with accordion FAQs
- Consistent styling with existing blogs

### Image Management
- Consistent path structure: `./imagesofblog/filename`
- Automatic alt text for accessibility
- Placed strategically in content flow

## Customization

### Modifying the Template
The CMS uses `coaching-black-white.html` as a template. To customize:

1. Edit the template file
2. The CMS will preserve:
   - Header structure and navigation
   - Footer content
   - CSS and JavaScript includes
   - Bootstrap components

### Adding New Features
The `BlogCMS` class is modular and can be extended:

- `collectSections()`: Modify section collection process
- `generateFAQsHTML()`: Customize FAQ output
- `createBlogHTML()`: Adjust HTML generation
- `generateJsonLD()`: Modify structured data

## Troubleshooting

### Common Issues

1. **"Template file not found"**:
   - Ensure `coaching-black-white.html` exists in the root directory

2. **"Permission denied"**:
   - Run `chmod +x blog-cms.js` to make the script executable

3. **"blogs.json not updating"**:
   - Check file permissions in the project directory

4. **"Images not showing"**:
   - Ensure images are placed in `./imagesofblog/` directory
   - Check the filename matches what you entered

### Best Practices

1. **Backup your blogs.json** before bulk operations
2. **Use descriptive image filenames** (no spaces, use hyphens)
3. **Keep section content concise** for better readability
4. **Test generated HTML** in a browser before publishing
5. **Organize images** by date or category for easier management

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the generated HTML for any formatting issues
3. Ensure all dependencies are installed
4. Verify file permissions and directory structure

## License

MIT License - Feel free to modify and distribute as needed.

---

**Happy Blogging! 🚀**
