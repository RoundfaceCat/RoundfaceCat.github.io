const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const BLOG_ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(BLOG_ROOT, 'source', '_posts');
const IMAGES_DIR = path.join(BLOG_ROOT, 'source', 'images');

[POSTS_DIR, IMAGES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, IMAGES_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});

const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file' });
    }
    const url = '/images/' + req.file.filename;
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', (req, res) => {
  try {
    const { title, tags, content } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title required' });
    }

    const tagList = tags
      ? tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
      : [];

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dateStr =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const tagYaml = tagList.length > 0
      ? '\ntags: [' + tagList.join(', ') + ']'
      : '';

    const md = `---
title: ${title}
date: ${dateStr}${tagYaml}
---

${(content || '').trim()}
`;

    const filename = title.replace(/[/\\?%*:|"<>]/g, '-') + '.md';
    const filePath = path.join(POSTS_DIR, filename);

    fs.writeFileSync(filePath, md, 'utf-8');

    res.json({
      success: true,
      message: `Post "${title}" created`,
      file: filename
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/posts', (_req, res) => {
  try {
    const files = fs.readdirSync(POSTS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const stat = fs.statSync(path.join(POSTS_DIR, f));
        return { name: f, mtime: stat.mtime };
      })
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 20)
      .map(f => f.name);

    res.json({ posts: files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/regenerate', (_req, res) => {
  const { exec } = require('child_process');
  const cmd = process.platform === 'win32'
    ? 'hexo clean && hexo generate'
    : 'hexo clean && hexo generate';

  exec(cmd, { cwd: BLOG_ROOT }, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: stderr || err.message });
    }
    res.json({ success: true, output: stdout });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Blog Admin PWA running at http://0.0.0.0:${PORT}`);
  console.log(`On mobile, open http://<your-pc-ip>:${PORT}`);
});
