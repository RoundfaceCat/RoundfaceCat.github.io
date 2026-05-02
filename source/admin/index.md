---
title: 发布文章
date: 2026-05-01 00:00:00
layout: false
---
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>发布文章</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #f5f6fa; color: #2d3436; min-height: 100vh; padding: 20px 16px;
}
.container { max-width: 800px; margin: 0 auto; }
h1 { font-size: 1.5rem; text-align: center; padding: 20px 0; color: #4a90d9; }
.form-group { margin-bottom: 14px; }
label { display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 5px; color: #555; }
input {
  width: 100%; padding: 11px 14px; font-size: 1rem;
  border: 1.5px solid #dfe6e9; border-radius: 10px;
  background: #fff; outline: none; font-family: inherit; -webkit-appearance: none;
}
input:focus { border-color: #4a90d9; }
.editor-wrapper { border: 1.5px solid #dfe6e9; border-radius: 10px; overflow: hidden; }
.EasyMDEContainer .editor-toolbar { border: none !important; }
.EasyMDEContainer .editor-toolbar button { color: #2d3436 !important; background: transparent !important; padding: 0 8px !important; border-radius: 0 !important; }
.EasyMDEContainer .editor-toolbar button:hover { background: #e9e9e9 !important; }
.EasyMDEContainer .CodeMirror { border: none !important; min-height: 350px; font-size: 1rem; }
button.form-btn {
  padding: 12px 28px; font-size: 1rem; font-weight: 700; border: none; border-radius: 10px;
  cursor: pointer; color: #fff; background: #4a90d9;
}
button.form-btn:disabled { opacity: 0.5; }
button.form-btn.danger { background: #e17055; }
.btn-row { display: flex; gap: 10px; margin-top: 16px; }
.btn-row button:first-child { flex: 1; }
.toast {
  position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
  background: #2d3436; color: #fff; padding: 12px 24px;
  border-radius: 25px; font-size: 0.95rem; z-index: 9999;
  opacity: 0; transition: opacity .3s; pointer-events: none;
}
.toast.show { opacity: 1; }
.toast.success { background: #00b894; }
.toast.error { background: #e17055; }
#loginBox { max-width: 400px; margin: 80px auto; text-align: center; }
#loginBox p { font-size: 0.85rem; color: #888; margin-top: 10px; }
#loginBox a { color: #4a90d9; }
#editorBox { display: none; }
</style>
</head>
<body>

<div id="loginBox">
  <h1>🔐 登录</h1>
  <div class="form-group">
    <label>GitHub Personal Access Token</label>
    <input type="password" id="tokenInput" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" autocomplete="off">
  </div>
  <p>
    还没有 Token？<br>
    <a href="https://github.com/settings/tokens/new?scopes=repo&description=blog-admin" target="_blank">
      点此创建一个（需要勾选 repo 权限）
    </a>
  </p>
  <button onclick="doLogin()" style="margin-top:12px;width:100%;">登录</button>
</div>

<div id="editorBox">
  <h1>📝 发布文章</h1>
  <form id="postForm">
    <div class="form-group">
      <label for="titleInput">标题 *</label>
      <input type="text" id="titleInput" placeholder="文章标题" required>
    </div>
    <div class="form-group">
      <label for="tagsInput">标签（逗号分隔）</label>
      <input type="text" id="tagsInput" placeholder="思维导图, 学习笔记">
    </div>
    <div class="form-group">
      <label>正文</label>
      <div class="editor-wrapper">
        <textarea id="contentInput"></textarea>
      </div>
    </div>
    <div class="btn-row">
      <button type="button" id="publishBtn" class="form-btn" onclick="doPublish()">📤 发布到博客</button>
      <button type="button" class="form-btn danger" onclick="doLogout()">退出</button>
    </div>
  </form>
</div>

<div class="toast" id="toast"></div>

<script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>
<script>
const OWNER = 'RoundfaceCat';
const REPO = 'RoundfaceCat.github.io';
const BRANCH = 'main';

let easyMDE;

function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + (type || '') + ' show';
  clearTimeout(t._t);
  t._t = setTimeout(function(){ t.classList.remove('show'); }, 3500);
}

function getToken() {
  return localStorage.getItem('blog_admin_token');
}

function setToken(t) {
  localStorage.setItem('blog_admin_token', t);
}

function clearToken() {
  localStorage.removeItem('blog_admin_token');
}

async function api(method, path, body) {
  var token = getToken();
  if (!token) throw new Error('请先登录');
  var res = await fetch('https://api.github.com' + path, {
    method: method,
    headers: {
      'Authorization': 'token ' + token,
      'Accept': 'application/vnd.github.v3+json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    var e = await res.json().catch(function(){ return {}; });
    throw new Error(e.message || 'HTTP ' + res.status);
  }
  return res.json();
}

async function doLogin() {
  var token = document.getElementById('tokenInput').value.trim();
  if (!token) return showToast('请输入 Token', 'error');

  try {
    var user = await (async function() {
      var res = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (!res.ok) throw new Error('Token 无效');
      return res.json();
    })();

    setToken(token);
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('editorBox').style.display = 'block';
    showToast('已登录：' + user.login, 'success');

    if (!easyMDE) {
      easyMDE = new EasyMDE({
        element: document.getElementById('contentInput'),
        spellChecker: false,
        placeholder: '支持 Markdown，拖入或粘贴图片...',
        toolbar: [
          'bold','italic','strikethrough','|',
          'heading-1','heading-2','heading-3','|',
          'quote','unordered-list','ordered-list','|',
          'link','image','|',
          'code','table','horizontal-rule','|',
          'preview','side-by-side','fullscreen','|',
          'guide'
        ],
        uploadImage: true,
        imageUploadFunction: function(file, onSuccess, onError) {
          uploadImage(file).then(onSuccess, onError);
        }
      });
    }
  } catch (err) {
    showToast('登录失败：' + err.message, 'error');
  }
}

function doLogout() {
  clearToken();
  if (easyMDE) easyMDE.value('');
  document.getElementById('titleInput').value = '';
  document.getElementById('tagsInput').value = '';
  document.getElementById('loginBox').style.display = 'block';
  document.getElementById('editorBox').style.display = 'none';
  showToast('已退出');
}

async function uploadImage(file) {
  var base64 = await new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function() { resolve(reader.result.split(',')[1]); };
    reader.readAsDataURL(file);
  });

  var ext = file.name.split('.').pop().toLowerCase() || 'png';
  var filename = Date.now() + '-' + Math.round(Math.random()*1e9) + '.' + ext;
  var path = 'source/images/' + filename;

  await api('PUT', '/repos/' + OWNER + '/' + REPO + '/contents/' + path, {
    message: 'Upload image: ' + filename,
    content: base64,
    branch: BRANCH
  });

  return '/images/' + filename;
}

async function doPublish() {
  var title = document.getElementById('titleInput').value.trim();
  if (!title) return showToast('请输入标题', 'error');

  var tags = document.getElementById('tagsInput').value.trim();
  var content = easyMDE.value();
  var btn = document.getElementById('publishBtn');

  btn.disabled = true;
  btn.textContent = '发布中...';

  try {
    var tagsStr = '';
    if (tags) {
      var tagList = tags.split(/[,，]/).map(function(t){ return t.trim(); }).filter(Boolean);
      if (tagList.length > 0) {
        tagsStr = '\ntags: [' + tagList.join(', ') + ']';
      }
    }

    var now = new Date();
    var p = function(n){ return String(n).padStart(2, '0'); };
    var dateStr = now.getFullYear() + '-' + p(now.getMonth()+1) + '-' + p(now.getDate()) + ' '
      + p(now.getHours()) + ':' + p(now.getMinutes()) + ':' + p(now.getSeconds());

    var md = '---\ntitle: ' + title + '\ndate: ' + dateStr + tagsStr + '\n---\n\n' + content.trim() + '\n';

    var filename = title.replace(/[/\\?%*:|"<>]/g, '-') + '.md';
    var base64 = btoa(unescape(encodeURIComponent(md)));

    await api('PUT', '/repos/' + OWNER + '/' + REPO + '/contents/source/_posts/' + filename, {
      message: 'New post: ' + title,
      content: base64,
      branch: BRANCH
    });

    showToast('发布成功！约1分钟后生效', 'success');
    document.getElementById('titleInput').value = '';
    document.getElementById('tagsInput').value = '';
    easyMDE.value('');
  } catch (err) {
    showToast('发布失败：' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📤 发布到博客';
  }
}

// Auto-login if token exists
window.addEventListener('DOMContentLoaded', function() {
  if (getToken()) {
    document.getElementById('tokenInput').value = getToken();
    doLogin();
  }
});
</script>
</body>
</html>
