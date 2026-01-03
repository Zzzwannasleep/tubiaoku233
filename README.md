# PicStoreJson - 图标自助上传工具

<p align="center">
  <a href="https://round.greentea520.xyz/"><b>🚀 在线体验</b></a>　
  <a href="https://github.com/Zzzwannasleep/tubiaoku233"><b>📦 GitHub 仓库</b></a>　
  <a href="https://github.com/huangxd-/PicStoreJson"><b>🧩 原项目</b></a>
</p>

<p align="center">
  <sub>
    1️⃣ 请勿上传无关内容 | 2️⃣ 遵守命名规则 | 3️⃣ 避免广告干扰 | 4️⃣ 保证文件规范（重名自动加后缀）
  </sub>
</p>

---

## ✨ 项目简介

**PicStoreJson** 是一个基于 **Python + Flask** 的轻量级 Web 应用，功能包括：

* 📤 图片自助上传 → 支持图床（PicGo / ImgURL / PICUI）
* 🧾 自动更新 GitHub Gist 的 `icons.json`（仅追加，不覆盖历史）
* 🧩 内置 **图标在线编辑器**：裁剪、手动抠图、一键上传
* 🤖 支持 **AI 抠图**：默认双通道（Clipdrop + remove.bg）自动均衡；支持密码解锁的「自定义AI模式」

---

## ✅ 功能清单

### 上传页

* **单张上传**：手动命名上传一张图片
* **批量上传**：自动使用文件名作为名称上传多张图片
* **自动重名处理**：若文件名已存在，自动在名称后加上序号（如 `name1`, `name2`）

### 编辑页（/editor）

* **裁剪功能**：支持 1:1 固定比例裁剪，拖动裁剪框即可
* **手动抠图**：用橡皮擦擦除背景，生成透明图
* **导出格式**：支持方形 PNG、圆形 PNG（透明圆形遮罩）
* **一键上传**：上传至图标库，确保便捷

### AI 抠图

* **默认AI（无需密码）**：Clipdrop + remove.bg 自动均衡负载，失败会自动切换服务
* **自定义AI（可选，密码解锁模式）**：输入密码后启用，适用于自定义 AI 抠图接口

---

## 📄 JSON 数据结构示例

```json
{
  "name": "Forward icon self-service upload",
  "description": "by huangxd-，图标自助上传",
  "icons": [
    { "name": "TVB", "url": "https://img.picgo.net/2025/07/12/example.png" }
  ]
}
```

---

## 📂 项目结构

```bash
project/
├── api/
│   └── index.py
├── static/
│   ├── css/
│   │   ├── style.css
│   │   └── editor.css
│   ├── js/
│   │   ├── script.js
│   │   └── editor.js
│   └── favicon.png
├── templates/
│   ├── index.html
│   └── editor.html
├── requirements.txt
└── vercel.json
```

---

## 🚀 一键部署（Vercel）

1.Fork 本项目到你的 GitHub

2.点击以下按钮创建 Vercel 项目并配置环境变量

3.记得把仓库换成你自己的仓库

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Zzzwannasleep/tubiaoku233&env=GIST_ID,GITHUB_USER,GITHUB_TOKEN,UPLOAD_SERVICE,PICGO_API_KEY,IMGURL_API_UID,IMGURL_API_TOKEN,IMGURL_ALBUM_ID,PICUI_TOKEN,PICUI_PERMISSION,PICUI_STRATEGY_ID,PICUI_ALBUM_ID,PICUI_EXPIRED_AT,CLIPDROP_API_KEY,REMOVEBG_API_KEY,FLASK_SECRET_KEY,CUSTOM_AI_ENABLED,CUSTOM_AI_PASSWORD,CUSTOM_AI_URL,CUSTOM_AI_FILE_FIELD,CUSTOM_AI_API_KEY,CUSTOM_AI_AUTH_HEADER,CUSTOM_AI_AUTH_PREFIX&envDescription=API%20Keys%20and%20GitHub%20Gist%20config&project-name=tubiaoku233&repo-name=tubiaoku233)

> **说明**：Deploy 按钮只能预设环境变量的名字，变量值需要在 Vercel 上手动填写。

---

## 🧰 环境变量说明

### GitHub Gist 配置（必填）

| 变量名            | 说明                           |
| -------------- | ---------------------------- |
| `GIST_ID`      | Gist ID（从 Gist URL 的最后一部分提取） |
| `GITHUB_USER`  | GitHub 用户名                   |
| `GITHUB_TOKEN` | GitHub Token（确保勾选 `gist` 权限） |

### 上传服务配置（选必填）

| 变量名                 | 说明                                              |
| ------------------- | ----------------------------------------------- |
| `UPLOAD_SERVICE`    | 选择上传服务：`PICGO` / `IMGURL` / `PICUI`（推荐 `PICUI`） |
| `PICGO_API_KEY`     | PicGo API 密钥                                    |
| `IMGURL_API_UID`    | ImgURL 用户 ID                                    |
| `IMGURL_API_TOKEN`  | ImgURL Token                                    |
| `PICUI_TOKEN`       | PICUI API Token                                 |
| `PICUI_PERMISSION`  | 图标权限：`0` 私有 / `1` 公开                            |
| `PICUI_STRATEGY_ID` | 进阶配置（可选）                                        |

### AI 抠图配置（选必选）

| 变量名                | 说明               |
| ------------------ | ---------------- |
| `CLIPDROP_API_KEY` | Clipdrop API 密钥  |
| `REMOVEBG_API_KEY` | remove.bg API 密钥 |

### 自定义 AI 抠图（密码解锁模式，选填）

| 变量名                    | 说明                  |
| ---------------------- | ------------------- |
| `CUSTOM_AI_ENABLED`    | `1` 开启自定义 AI 抠图功能   |
| `CUSTOM_AI_PASSWORD`   | 解锁密码                |
| `CUSTOM_AI_URL`        | 自定义 AI 抠图接口的 URL    |
| `CUSTOM_AI_FILE_FIELD` | 上传图片字段名（默认 `image`） |

---

## 🧭 使用指南

### 1) 单张上传

1. 在「图片名称」框中填写名称
2. 选择一张图片
3. 点击「单张上传」

### 2) 批量上传

1. 选择多张图片
2. 点击「批量上传」
3. 名称将自动取自文件名（不包括扩展名）

### 3) 编辑器使用

1. 访问 `/editor` 页面
2. 导入图片
3. 进行裁剪（1:1比例）或抠图
4. 导出或一键上传到图标库

### 4) AI 抠图

* 默认AI：点击「默认AI抠图」按钮即可
* 自定义AI：输入解锁密码后，点击「自定义AI抠图」

---

## 🔒 安全说明

* 不存储用户上传的图片
* 不记录用户信息
* 图片直接上传至图床
* 仅修改用户的 Gist 文件（`icons.json`）
* 自定义 AI 模式使用密码解锁，并通过 HttpOnly cookie 限制前端 JS 读取，降低风险

---

## 🐛 常见问题

### 1) JSON 没更新？

Gist 在浏览器可能会缓存，建议清除缓存或稍等再刷新。

### 2) 上传失败？

* 确认 Vercel 环境变量配置正确
* 确认 GitHub Token 权限
* 检查图床服务（PicGo/ImgURL/PICUI）的 API 密钥是否有效

### 3) AI 抠图报错？

* 检查 `CLIPDROP_API_KEY` 或 `REMOVEBG_API_KEY` 是否配置正确
* 如果使用自定义 AI，确认密码和 URL 配置正确

---

## 🙏 致谢

* [PicGo](https://www.picgo.net/) / [ImgURL](https://www.imgurl.org) / [PICUI](https://picui.cn/) 提供图床服务
* [CropperJS](https://github.com/fengyuanchen/cropperjs) 提供裁剪能力
