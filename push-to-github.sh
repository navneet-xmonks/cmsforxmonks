#!/bin/bash

# Commands to run after creating GitHub repository
# Replace YOUR_GITHUB_USERNAME with your actual GitHub username

echo "🚀 Pushing xMonks Blog CMS to GitHub..."

# Set the remote origin (replace YOUR_GITHUB_USERNAME)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/xmonks-blog-cms.git

# Set main branch
git branch -M main

# Push to GitHub
git push -u origin main

echo "✅ Repository pushed to GitHub!"
echo "📦 Ready for deployment!"