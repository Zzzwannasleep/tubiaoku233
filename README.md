# PicStoreJson - 图标自助上传工具

<p align="center">
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

* 📤 图片自助上传 → 支持图床（PicGo / ImgURL / PICUI / GitHub Repo）
* 🧾 自动更新 GitHub Gist 的 `icons.json`（仅追加，不覆盖历史）
* 🧩 内置 **图标在线编辑器**：裁剪、手动抠图、一键上传
* 🤖 支持 **AI 抠图**：默认双通道（Clipdrop + remove.bg）自动均衡；支持密码解锁的「自定义AI模式」
* 🔒 新增 **管理后台（/manage）**：密码登录、分页浏览、单删/批量删除（删除成功才同步移除 Gist，保证一致性）

---

## ✅ 功能清单

### 上传页

* **单张上传**：手动命名上传一张图片
* **批量上传**：自动使用文件名作为名称上传多张图片
* **自动重名处理**：若文件名已存在，自动在名称后加上序号（如 `name1`, `name2`）
* **Gist 流控优化**：批量上传每积攒 10 条再写入一次 Gist（可降低流控风险）

### 编辑页（/editor）

* **裁剪功能**：支持 1:1 固定比例裁剪，拖动裁剪框即可
* **手动抠图**：用橡皮擦擦除背景，生成透明图
* **导出格式**：支持方形 PNG、圆形 PNG（透明圆形遮罩）
* **一键上传**：上传至图标库，确保便捷
* **AI抠图**：AI一键去除背景，生成透明图

### AI 抠图

* **默认AI（无需密码）**：Clipdrop + remove.bg 自动均衡负载，失败会自动切换服务
* **自定义AI（可选，密码解锁模式）**：输入密码后启用，适用于自定义 AI 抠图接口

### 管理后台（/manage）

* **密码登录**（HttpOnly Cookie）
* **分页浏览**：管理页 1 页 = PICUI 的 1 页，避免一次性加载过多导致流控
* **查看图片 + URL + 是否已收录到 `icons.json`**
* **单删 / 批量删除**
  - 先删 PICUI
  - **仅当 PICUI 删除成功才会从 icons.json 移除对应 URL**（删除失败不影响 Gist 一致性）
  - 批量删除时对 icons.json 仅合并为一次 PATCH（降低 Gist 流控风险）

---

## 📄 JSON 数据结构示例

```json
{
  "name": "Forward",
  "description": "",
  "icons": []
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
│   │   ├── editor.css
│   │   ├── manage.css
│   │   └── github.css
│   ├── js/
│   │   ├── script.js
│   │   ├── editor.js
│   │   └── github.js
│   └── favicon.png
├── templates/
│   ├── index.html
│   ├── github.html
│   ├── editor.html
│   └── manage.html
├── .env.example
├── requirements.txt
└── vercel.json
```

---

## 🧰 快速开始（部署前准备）

1. 创建一个 GitHub Gist（建议 Secret/Private），新建文件 `icons.json`，内容参考上面的 JSON 示例，然后记录 `GIST_ID`
2. 选择上传模式：
   - `PICUI`：准备 `PICUI_TOKEN`（/manage 也依赖它）
   - `GITHUB`：先创建一个仓库（建议公开），然后设置 `GITHUB_REPO=owner/repo`（或 `GITHUB_REPO_OWNER` + `GITHUB_REPO_NAME`），并准备 `GITHUB_REPO_TOKEN`（Contents 写权限）
3. 参考仓库里的 `.env.example` 把环境变量填好（本地可复制为 `.env`），再部署到 Vercel

## 🔗 页面 & JSON

| 类型 | 路径 |
| --- | --- |
| 上传页（PICUI/PicGo/ImgURL） | `/`（GitHub 模式会自动跳转到 `/github`） |
| GitHub 图床页（仅 `UPLOAD_SERVICE=GITHUB`） | `/github` |
| 图标编辑器 | `/editor` |
| 管理后台（需要开启 `ADMIN_ENABLED=1` 且配置 `PICUI_TOKEN`） | `/manage` |
| JSON（默认） | `/icons.json` |
| JSON（GitHub 分类） | `/icons-square.json` / `/icons-circle.json` / `/icons-transparent.json` |

## 🚀 一键部署（Vercel）

1. Fork 本项目到你的 GitHub
2. 点击下方按钮创建 Vercel 项目并配置环境变量
3. 记得把仓库换成你自己的仓库

> **说明**：Deploy 按钮只能预设环境变量的名字，变量值需要在 Vercel 上手动填写。
>
> 建议先参考 `.env.example`，把需要的值准备好再去填。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Zzzwannasleep/tubiaoku233&env=GIST_ID,GITHUB_USER,GITHUB_TOKEN,GITHUB_GIST_FILE_SQUARE,GITHUB_GIST_FILE_CIRCLE,GITHUB_GIST_FILE_TRANSPARENT,UPLOAD_SERVICE,GITHUB_REPO,GITHUB_REPO_OWNER,GITHUB_REPO_NAME,GITHUB_REPO_BRANCH,GITHUB_REPO_DIR,GITHUB_REPO_TOKEN,GITHUB_REPO_URL_MODE,GITHUB_REPO_URL_PREFIX,GITHUB_REPO_COMMIT_MESSAGE,PICGO_API_KEY,IMGURL_API_UID,IMGURL_API_TOKEN,IMGURL_ALBUM_ID,PICUI_TOKEN,PICUI_PERMISSION,PICUI_STRATEGY_ID,PICUI_ALBUM_ID,PICUI_EXPIRED_AT,CLIPDROP_API_KEY,REMOVEBG_API_KEY,FLASK_SECRET_KEY,CUSTOM_AI_ENABLED,CUSTOM_AI_PASSWORD,CUSTOM_AI_URL,CUSTOM_AI_FILE_FIELD,CUSTOM_AI_API_KEY,CUSTOM_AI_AUTH_HEADER,CUSTOM_AI_AUTH_PREFIX,ADMIN_ENABLED,ADMIN_PASSWORD,ADMIN_COOKIE_MAX_AGE,RANDOM_BG_API&envDescription=API%20Keys%20and%20GitHub%20Gist%2FRepo%20config%20%2B%20Admin%20Panel&project-name=tubiaoku233&repo-name=tubiaoku233)

---

## 🧰 环境变量说明

### ✅ GitHub Gist 配置（必填）

| 变量名            | 说明                           |
| -------------- | ---------------------------- |
| `GIST_ID`      | Gist ID（从 Gist URL 的最后一部分提取） |
| `GITHUB_USER`  | GitHub 用户名                   |
| `GITHUB_TOKEN` | GitHub Token（确保勾选 `gist` 权限） |

### ✅ Flask / 通用配置（强烈建议）

| 变量名                | 说明                                |
| ------------------ | --------------------------------- |
| `FLASK_SECRET_KEY` | Flask/签名 Cookie 用的密钥（建议设置为随机长字符串） |

### 📤 上传服务配置（按所选服务填写）

| 变量名                 | 说明                                              |
| ------------------- | ----------------------------------------------- |
| `UPLOAD_SERVICE`    | 选择上传服务：`PICGO` / `IMGURL` / `PICUI` / `GITHUB`（推荐 `PICUI` / `GITHUB`） |
| `PICGO_API_KEY`     | PicGo API 密钥                                    |
| `IMGURL_API_UID`    | ImgURL 用户 ID                                    |
| `IMGURL_API_TOKEN`  | ImgURL Token                                    |
| `IMGURL_ALBUM_ID`   | ImgURL 相册 ID（如你的实现支持，可选）                        |
| `PICUI_TOKEN`       | PICUI API Token（管理后台删除/列表也依赖它）                  |
| `PICUI_PERMISSION`  | 图标权限：`0` 私有 / `1` 公开                            |
| `PICUI_STRATEGY_ID` | 进阶配置（可选）                                        |
| `PICUI_ALBUM_ID`    | 上传到指定相册（可选）                                     |
| `PICUI_EXPIRED_AT`  | 过期时间（可选）                                        |
| `GITHUB_REPO`           | GitHub 图床仓库：`owner/repo`（推荐新建公开仓库专门存图）               |
| `GITHUB_REPO_OWNER`     | 仓库 owner（可选，和 `GITHUB_REPO_NAME` 搭配）                         |
| `GITHUB_REPO_NAME`      | 仓库名（可选）                                                     |
| `GITHUB_REPO_BRANCH`    | 分支（默认 `main`）                                               |
| `GITHUB_REPO_DIR`       | 存放目录（默认 `images`）                                         |
| `GITHUB_REPO_TOKEN`     | Repo Token（需 Contents 写权限；留空则复用 `GITHUB_TOKEN`）          |
| `GITHUB_REPO_URL_MODE`  | 外链模式：`RAW` / `JSDELIVR` / `PREFIX`（默认 `RAW`）              |
| `GITHUB_REPO_URL_PREFIX`| 当 `URL_MODE=PREFIX` 时的 URL 前缀（例如 GitHub Pages）             |
| `GITHUB_REPO_COMMIT_MESSAGE` | commit message 模板（可用 `{filename}`）                      |
| `GITHUB_GIST_FILE_SQUARE`      | GitHub 模式：方形分类写入的 Gist 文件名（默认 `icons-square.json`）       |
| `GITHUB_GIST_FILE_CIRCLE`      | GitHub 模式：圆形分类写入的 Gist 文件名（默认 `icons-circle.json`）       |
| `GITHUB_GIST_FILE_TRANSPARENT` | GitHub 模式：透明分类写入的 Gist 文件名（默认 `icons-transparent.json`） |

> 提示：
> - `GITHUB_REPO` 必须是 `owner/repo`（不要只填 `repo`）
> - GitHub Repo 模式建议仓库公开（`RAW`/`JSDELIVR` 才能直接外链访问）
> - 如果你想把 3 个分类都写回同一个 `icons.json`：把 `GITHUB_GIST_FILE_*` 都设置成 `icons.json`
>
> PS：目前 /manage 管理后台依赖 PICUI 的图片列表/删除接口，因此需要配置 `PICUI_TOKEN` 才能正常使用。

### ✂️ AI 抠图配置（可选）

| 变量名                | 说明               |
| ------------------ | ---------------- |
| `CLIPDROP_API_KEY` | Clipdrop API 密钥  |
| `REMOVEBG_API_KEY` | remove.bg API 密钥 |

### 🔐 自定义 AI 抠图（密码解锁模式，可选）

| 变量名                     | 说明                         |
| ----------------------- | -------------------------- |
| `CUSTOM_AI_ENABLED`     | 自定义 AI 抠图功能（默认 `0`关闭 可选`1`开启 ）  |
| `CUSTOM_AI_PASSWORD`    | 解锁密码                       |
| `CUSTOM_AI_URL`         | 自定义 AI 抠图接口的 URL           |
| `CUSTOM_AI_FILE_FIELD`  | 上传图片字段名（默认 `image`）        |
| `CUSTOM_AI_API_KEY`     | 自定义 AI 的鉴权 key（可选）         |
| `CUSTOM_AI_AUTH_HEADER` | 鉴权头（默认 `Authorization`，可选） |
| `CUSTOM_AI_AUTH_PREFIX` | 鉴权前缀（例如 `Bearer `，可选）      |

### 🧑‍💻 管理后台（/manage）（可选，但推荐）

| 变量名                    | 说明                               |
| ---------------------- | -------------------------------- |
| `ADMIN_ENABLED`        | 管理后台（默认 `0`关闭 `1` 开启）               |
| `ADMIN_PASSWORD`       | 管理后台登录密码                         |
| `ADMIN_COOKIE_MAX_AGE` | 登录 Cookie 有效期（秒），默认 `86400`（一天） |

> 管理后台依赖 `PICUI_TOKEN`：用于分页拉取图片列表、删除图片。

### 🌸 二次元随机背景（可选）

| 变量名             | 说明                                                   |
| --------------- | ---------------------------------------------------- |
| `RANDOM_BG_API` | 随机背景图 API，默认：`https://api.btstu.cn/sjbz/?lx=dongman` |

---

## 🧭 使用指南

### 0) GitHub 图床模式（UPLOAD_SERVICE=GITHUB）

* 访问 `/` 会自动跳转到 `/github`，可选择上传到 `square / circle / transparent` 分类文件夹
* 对应 JSON 订阅链接：`/icons-square.json`、`/icons-circle.json`、`/icons-transparent.json`

### 1) 单张上传

1. 在「图片名称」框中填写名称
2. 选择一张图片
3. 点击「单张上传」

### 2) 批量上传

1. 选择多张图片
2. 点击「批量上传」
3. 名称将自动取自文件名（不包括扩展名）

### 3) 编辑器使用（/editor）

1. 访问 `/editor`
2. 导入图片
3. 进行裁剪（1:1比例）或抠图
4. 导出或一键上传到图标库

### 4) AI 抠图

* 默认AI：点击「默认AI抠图」按钮即可
* 自定义AI：输入解锁密码后，点击「自定义AI抠图」

### 5) 管理后台（/manage）

1. 配置环境变量：`ADMIN_ENABLED=1`、`ADMIN_PASSWORD=...`、`PICUI_TOKEN=...`
2. 访问 `/manage` 输入密码登录
3. 分页浏览 / 搜索 / 勾选批量删除
4. 删除规则：**先删 PICUI，成功才同步移除 Gist 中对应 URL**

---

## 🔒 安全说明

* 不存储用户上传的图片
* 不记录用户信息
* 图片直接上传至图床
* 仅修改用户的 Gist 文件（`icons.json`）
* 自定义 AI 模式通过 HttpOnly cookie 限制前端 JS 读取，降低风险
* 管理后台同样使用 HttpOnly cookie，建议务必设置 `FLASK_SECRET_KEY`

---

## 🐛 常见问题

### 1) JSON 没更新？

Gist 在浏览器可能会缓存，建议清除缓存或稍等再刷新。

### 2) 上传失败？

* 确认 Vercel 环境变量配置正确
* 确认 GitHub Token 权限（gist）
* 若使用 `UPLOAD_SERVICE=GITHUB`：确认 Token 具备仓库 Contents 写权限，且仓库为公开（否则 RAW/JSDELIVR 无法直接外链）
* 检查图床服务（PicGo/ImgURL/PICUI/GitHub Repo）的 API 密钥是否有效

### 3) 管理后台无法使用？

* 确认 `ADMIN_ENABLED=1`
* 确认 `ADMIN_PASSWORD` 已配置
* 确认 `PICUI_TOKEN` 已配置（管理后台依赖它访问 PICUI 列表/删除接口）

### 4) AI 抠图报错？

* 检查 `CLIPDROP_API_KEY` 或 `REMOVEBG_API_KEY` 是否配置正确
* 使用自定义 AI 时确认 `CUSTOM_AI_URL` / `CUSTOM_AI_PASSWORD` 等配置正确

## 🙏 致谢

* [PicGo](https://www.picgo.net/) / [ImgURL](https://www.imgurl.org) / [PICUI](https://picui.cn/) / [GitHub](https://github.com/) 提供图床服务
* [CropperJS](https://github.com/fengyuanchen/cropperjs) 提供裁剪能力
