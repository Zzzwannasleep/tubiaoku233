# 📦 PicStoreJson

🚀 [在线体验](https://tubiao666.greentea520.xyz)  
📦 [本仓库](https://github.com/Zzzwannasleep/tubiaoku233)  
📦 [原始仓库](https://github.com/huangxd-/PicStoreJson)

> 1️⃣ 不要肆意上传  
> 2️⃣ 禁止广告  
> 3️⃣ 请勿上传无关内容  
> 4️⃣ 请规范命名（重复请勿再传）

---

## ✨ 项目简介

**PicStoreJson** 是一个基于 **Python + Flask** 的轻量级 Web 应用，用于实现：

**图片自助上传 → 图床存储 → 自动写入 GitHub Gist JSON 文件**

适合场景：
- 图标库 / 资源库
- JSON 订阅式图床
- 小团队共享图片入口

---

## 🚀 核心功能

### 📤 图片上传
- 支持 **单张上传 / 批量上传**
- 支持 **PicGo / ImgURL / PICUI**
- 移动端友好，手机可直接上传

### 🧠 命名与去重
- 单张上传：手动填写名称
- 批量上传：自动使用文件名（去扩展名）作为名称
- 自动检测重名并追加 `_1 / _2 / _3`

### 🧾 自动维护 Gist JSON
- 自动追加 `{ name, url }`
- 不覆盖历史数据
- 可作为订阅链接长期使用

### 📊 批量体验增强
- 批量文件预览
- 实时上传进度条
- 逐条成功 / 失败提示

### ☁️ Vercel 一键部署
- Serverless
- 无数据库
- Fork 即用

---

## 🧑‍💻 使用说明

### 单张上传（精确命名）
1. 在「图片名称」输入框填写名称  
2. 选择 **1 张图片**  
3. 点击 **单张上传**

适合重要图标、需要人工命名的场景。

---

### 批量上传（高效率）
1. 「图片名称」输入框可留空  
2. 一次选择 **多张图片**  
3. 页面会显示批量预览（将使用的名称）  
4. 点击 **批量上传**

批量上传每张图片将使用：  
`文件名（去扩展名）` 作为名称  
例如：`icon-home.png` → `icon-home`

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
| 分类  | 技术                             |
| --- | ------------------------------ |
| 后端  | Python · Flask                 |
| 前端  | HTML · CSS · JavaScript        |
| API | PicGo API / ImgURL API / PICUI |
| 存储  | GitHub Gist                    |
| 部署  | Vercel                         |

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
| 变量                  | 用途           | 备注                     |
| ------------------- | ------------ | ---------------------- |
| `GIST_ID`           | Gist ID      | 必填                     |
| `GITHUB_USER`       | GitHub 用户名   | 必填                     |
| `GITHUB_TOKEN`      | Gist Token   | 必填（gist 权限）            |
| `UPLOAD_SERVICE`    | 使用的图床        | PICGO / IMGURL / PICUI |
| `PICGO_API_KEY`     | PicGo        | 测试用                    |
| `IMGURL_API_UID`    | ImgURL UID   | 可选                     |
| `IMGURL_API_TOKEN`  | ImgURL Token | 可选                     |
| `IMGURL_ALBUM_ID`   | ImgURL 相册    | 可选                     |
| `PICUI_TOKEN`       | PICUI Token  |  推荐                   |
| `PICUI_PERMISSION`  | 公开/私有        | 0 / 1                  |
| `PICUI_STRATEGY_ID` | 存储策略         | 可选                     |
| `PICUI_ALBUM_ID`    | 相册           | 可选                     |
| `PICUI_EXPIRED_AT`  | 过期时间         | 可选                     |

⚠️ PICUI 一定要认真填写
PicGo / ImgURL 可用于测试，PICUI 才是推荐方案

## 🚀 一键部署（Vercel）

1. Fork 本项目  
2. 点击下方按钮  
3. 填写环境变量并 Deploy  

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Zzzwannasleep/tubiaoku233&env=GIST_ID,GITHUB_USER,GITHUB_TOKEN,UPLOAD_SERVICE,PICGO_API_KEY,IMGURL_API_UID,IMGURL_API_TOKEN,IMGURL_ALBUM_ID,PICUI_TOKEN,PICUI_PERMISSION,PICUI_STRATEGY_ID,PICUI_ALBUM_ID,PICUI_EXPIRED_AT&envDescription=GitHub%20Gist%20and%20Image%20Upload%20Service%20Configuration&project-name=picstorejson&repo-name=picstorejson)

🔒 安全说明
· 不存储用户图片
· 不记录用户信息
· 图片直传图床
· 仅修改你自己提供的 GitHub Gist

🐛 常见问题

1.部署失败：
```
部署失败 / 上传失败
检查环境变量是否正确
查看 Vercel Logs
确认 GitHub Token 包含 gist 权限
页面样式未更新
强制刷新浏览器（Ctrl + Shift + R）
修改 CSS / JS 引用版本号
```
⭐ 致谢
原项目作者：[PicStoreJson](https://github.com/huangxd-/PicStoreJson)
感谢 [PicGo](https://www.picgo.net/?lang=zh-CN) / [IMGURL](https://www.imgurl.org) / [PICUI](https://picui.cn/) 提供服务支持
