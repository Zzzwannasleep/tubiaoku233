# 📦 PicStoreJson

<p align="center">
  <a href="https://tubiao666.greentea520.xyz"><b>🚀 在线体验</b></a>
  <a href="https://github.com/Zzzwannasleep/tubiaoku233"><b>📦 GitHub 仓库</b></a>
  <a href="https://github.com/huangxd-/PicStoreJson"><b>📦 原 GitHub 仓库</b></a>
</p>

<p align="center">
  <sub>
    1️⃣ 不要肆意上传 ｜ 2️⃣ 禁止广告 ｜ 3️⃣ 请勿上传无关内容 ｜ 4️⃣ 请规范命名（没有再上传）
  </sub>
</p>

---

## ✨ 项目简介

**PicStoreJson** 是一个基于 **Python + Flask** 的轻量级 Web 应用，  
用于 **图片自助上传 → 图床 → 自动写入 GitHub Gist JSON 文件**。
---

## 🚀 核心功能

- 📤 **图片上传**
  - 支持 PicGo API / ImgURL API
  - 移动端友好页面，手机可直接上传

- 🔁 **名称唯一性校验**
  - 自动检测重名
  - 重名自动追加 `_1 / _2 / _3`

- 🧾 **自动维护 Gist JSON**
  - 图片名称 + URL 自动追加
  - 不覆盖历史数据

- 📱 **移动端优化**
  - 触摸友好
  - 适合手机 / 平板操作

- ☁️ **Vercel 一键部署**
  - 无服务器
  - Fork 即用

---

## 📄 JSON 数据结构示例

```json
{
  "name": "Forward icon self-service upload",
  "description": "by huangxd-，图标自助上传",
  "icons": [
    {
      "name": "TVB",
      "url": "https://img.picgo.net/2025/07/12/example.png"
    }
  ]
}
```

##技术栈
```
| 分类  | 技术                      |
| --- | ----------------------- |
| 后端  | Python · Flask          |
| 前端  | HTML · CSS · JavaScript |
| API | PicGo API / ImgURL API  |
| 存储  | GitHub Gist             |
| 部署  | Vercel                  |
```

📂 项目结构
```
project/
├── api/
│   └── index.py
├── static/
│   ├── css/style.css
│   └── js/script.js
├── templates/
│   └── index.html
├── requirements.txt
└── vercel.json
```

⚙️ 部署指南（Vercel）
--
1️⃣ 创建 GitHub Gist
文件名：icons.json
初始内容：
```
{
  "name": "Forward",
  "description": "",
  "icons": []
}
```
复制 Gist ID 就是网址最后面的那一串

2️⃣ 创建 GitHub Token

GitHub → Settings → Developer settings → Tokens (classic)
勾选权限：gist
保存 Token

🌍 环境变量说明
在 Vercel → Project Settings → Environment Variables 中配置：
| 变量名                | 说明                 |
| ------------------ | ------------------ |
| `GIST_ID`          | GitHub Gist ID     |
| `GITHUB_USER`      | GitHub 用户名         |
| `GITHUB_TOKEN`     | GitHub Token       |
| `UPLOAD_SERVICE`   | `PICGO` / `IMGURL` |
| `PICGO_API_KEY`    | PicGo API Key      |
| `IMGURL_API_UID`   | ImgURL UID         |
| `IMGURL_API_TOKEN` | ImgURL Token       |
| `IMGURL_ALBUM_ID`  | ImgURL 相册 ID（可选）   |
⚠️ PICUI 一定要认真填写
PicGo / ImgURL 可用于测试，PICUI 才是推荐方案

## 🚀 一键盘部署

1. 先 Fork 本项目  
2. 点击下方按钮，填写变量 没有的 自行前往设置添加

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/huangxd-/PicStoreJson&env=PICGO_API_KEY,GIST_ID,GITHUB_USER,GITHUB_TOKEN,UPLOAD_SERVICE,IMGURL_API_UID,IMGURL_API_TOKEN,IMGURL_ALBUM_ID&envDescription=API%20Keys%20and%20GitHub%20Gist%20config&project-name=picstorejson&repo-name=picstorejson)

🐛 常见问题

1.部署失败：
```
检查环境变量
查看 Vercel Logs
上传失败
API Key 是否正确
Token 是否包含 gist 权限
页面异常
检查 vercel.json
确认静态资源路径正确
```

