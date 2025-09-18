# xMonks Blog CMS - Deployment Guide

## 🚀 Live CMS for xMonks Blog Creation

A powerful, modern CMS for creating structured blog posts with:
- ✅ WYSIWYG Editor (Quill.js)
- ✅ DOCX File Upload & Parsing
- ✅ Automatic Image Extraction
- ✅ FAQ Management
- ✅ JSON-LD Schema Generation
- ✅ ZIP Download (Blog + Images + Index)

## 📦 What You Get

When you create a blog, you get:
1. **Responsive HTML Blog Post** - Ready for web
2. **Extracted Images** - Optimized and saved
3. **Updated Blog Index** - JSON file for blog listing
4. **ZIP Package** - Everything bundled for easy deployment

## 🚀 Quick Deploy

### Option 1: Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Option 2: Railway
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Option 3: Render
1. Connect GitHub repo
2. Set build command: `npm install`
3. Set start command: `npm start`

## 🌐 Environment Variables

- `PORT` - Server port (default: 3000)

## 📁 File Structure

```
├── web-server.js          # Main server
├── blog-cms.js           # CLI version
├── modern-frontend.html  # Web interface
├── blogs/               # Generated blogs
├── imagesofblog/        # Uploaded images
└── blogs.json          # Blog index
```

## 🎯 Usage

1. Access the web interface
2. Upload DOCX or fill form manually
3. Edit content in WYSIWYG editor
4. Create blog post
5. Download ZIP package
6. Deploy to your website!

---

**Built with ❤️ by xMonks Team**