# PicStoreJson

<p align="center">
  <img src="https://img.picgo.net/2025/07/13/PicStoreJson5de53c3c9bd498d4.jpg" alt="" width="400px"/>
  <br>
  [上传链接](https://tubiao666.greentea520.xyz)
  <br>
  <span>1. 不要肆意上传 2. 广告不要上传 3. 乱七八糟的不要上传 4.请好好命名 没有的再上传 </span>
</p>

## 项目用途

本项目是一个基于 Python 和 Flask 的 Web 应用，允许用户通过移动端友好的网页上传图片到 PicGo API 或 ImgURL API，并将图片的名称和 URL 存储到 GitHub Gist 的 JSON 文件中。项目具有以下功能：

- **图片上传**：用户输入名称并上传图片到 PicGo API 或 ImgURL API（可配置）。
- **名称唯一性检查**：防止重复名称，重复时增加后缀数字自增1。
- **Gist 更新**：将图片名称和 URL 以追加方式存储到 Gist 的 JSON 文件中，格式如下：
  ```json
  {
    "name": "Forward icon self-service upload",
    "description": "by huangxd-，图标自助上传",
    "icons": [
      {"name": "TVB", "url": "https://img.picgo.net/2025/07/12/34FB618D-E746-4FFA-BA63-08C03831B3DC_CocoAI_20250712_07011708f728f2e77f9dca.md.png"}
    ]
  }
  ```
- **移动端适配**：前端页面针对手机优化，易于触摸操作。
- **部署友好**：适配 Vercel 平台，支持一键部署。

## 技术栈

- **后端**：Python, Flask
- **前端**：HTML, CSS, JavaScript
- **依赖**：requests（用于 API 调用）
  - **部署**：Vercel

## 部署到 Vercel

### 准备工作

1. **创建 GitHub Gist**：
   - 登录 GitHub，访问 [gist.github.com](https://gist.github.com/)。
   - 创建一个新 Gist，文件名设为 `icons.json`，初始内容如下：
     ```json
     {
       "name": "Forward",
       "description": "",
       "icons": []
     }
     ```
   - 复制 Gist ID（URL 中的哈希值，例如 `https://gist.github.com/username/1234567890abcdef` 中的 `1234567890abcdef`）。

2. **生成 GitHub Personal Access Token**：
   - 访问 GitHub 设置 > Developer settings > Personal access tokens > Tokens (classic)。
   - 创建新 Token，勾选 `gist` 权限，复制 Token。

3. **获取 PicGo API 密钥**：
   - 确保你有 PicGo API 的密钥（`X-API-Key`），通常由 [PicGo](https://www.picgo.net) 服务提供。

4. **获取 ImgURL API 信息（可选）**：
   - 如果使用 ImgURL 服务 [ImgURL](https://www.imgurl.org/) ，你需要从 ImgURL 后台获取 UID 和 TOKEN
   - 默认的 ImgURL API 地址为 `https://www.imgurl.org/api/v2/upload`，如果你的账号在其他服务商注册，请修改为对应服务商的域名

5. **克隆或创建项目**：
   - 将项目代码克隆到本地，或创建一个新仓库，包含以下结构：
     ```
     project/
     ├── api/
     │   └── index.py
     ├── static/
     │   ├── css/
     │   │   └── style.css
     │   └── js/
     │       └── script.js
     ├── templates/
     │   └── index.html
     ├── requirements.txt
     └── vercel.json
     ```

### 手动部署到 Vercel

1. **创建 GitHub 仓库**：
   - 将项目文件推送到 GitHub 仓库。
   - 确保 `requirements.txt` 和 `vercel.json` 已正确配置。

2. **登录 Vercel**：
   - 访问 [vercel.com](https://vercel.com/) 并登录。

3. **导入仓库**：
   - 点击 “Add New” > “Project”。
   - 选择你的 GitHub 仓库并导入。

4. **配置环境变量**：
   - 在 Vercel 项目设置的 "Environment Variables" 页面，添加以下变量：
     - `PICGO_API_KEY`：你的 PicGo API 密钥（如果使用 PicGo 服务）。
     - `GIST_ID`：你的 Gist ID。
     - `GITHUB_USER`：你的 GITHUB USER。
     - `GITHUB_TOKEN`：你的 GitHub Personal Access Token。
     - `UPLOAD_SERVICE`：上传服务类型，设置为 `PICGO`（默认）或 `IMGURL`。
     - `IMGURL_API_UID`：你的 ImgURL UID（如果使用 ImgURL 服务）。
     - `IMGURL_API_TOKEN`：你的 ImgURL TOKEN（如果使用 ImgURL 服务）。
     - `IMGURL_ALBUM_ID`：相册 ID（可选，如果不使用相册功能可以留空，如果使用 ImgURL 服务可选配置）。
   - 确保变量名称与 `api/index.py` 中的一致。

5. **部署**：
   - 点击 “Deploy”，Vercel 将自动检测 `vercel.json` 并构建项目。
   - 部署完成后，访问提供的 URL（例如 `https://your-project.vercel.app`）。

### 一键部署到 Vercel

你可以通过以下按钮一键部署项目到 Vercel：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/huangxd-/PicStoreJson&env=PICGO_API_KEY,GIST_ID,GITHUB_USER,GITHUB_TOKEN,UPLOAD_SERVICE,IMGURL_API_UID,IMGURL_API_TOKEN,IMGURL_ALBUM_ID&env-description=PicGo%20API%20Key,%20GitHub%20Gist%20ID,%20GitHub%20Personal%20Access%20Token,%20Upload%20Service%20Type,%20ImgURL%20UID,%20ImgURL%20TOKEN,%20and%20ImgURL%20Album%20ID)

**步骤**：
1. 点击上方按钮，登录 Vercel。
2. 选择你的 GitHub 仓库（需先将项目推送到 GitHub）。
3. 在部署配置页面，输入以下环境变量：
   - `PICGO_API_KEY`：你的 PicGo API 密钥（如果使用 PicGo 服务）。
   - `GIST_ID`：你的 Gist ID。
   - `GITHUB_USER`：你的 GITHUB USER。
   - `GITHUB_TOKEN`：你的 GitHub Personal Access Token。
   - `UPLOAD_SERVICE`：上传服务类型，设置为 `PICGO`（默认）或 `IMGURL`。
   - `IMGURL_API_UID`：你的 ImgURL UID（如果使用 ImgURL 服务）。
   - `IMGURL_API_TOKEN`：你的 ImgURL TOKEN（如果使用 ImgURL 服务）。
   - `IMGURL_ALBUM_ID`：相册 ID（可选，如果不使用相册功能可以留空，如果使用 ImgURL 服务可选配置）。
   - `IMGURL_ALBUM_ID`：相册 ID（可选，如果不使用相册功能可以留空，如果使用 ImgURL 服务可选配置）。
4. 点击 "Deploy"，等待部署完成。

**注意**：
- 替换 `YOUR_GITHUB_REPOSITORY_URL` 为你的实际 GitHub 仓库 URL。
- 确保仓库包含所有必要文件（`api/index.py`, `static/`, `templates/`, `requirements.txt`, `vercel.json`）。
- Zzz：补充说明一下 这个项目可以直接Fork我这个 改好了 用[PICUI]([https://vercel.com/](https://picui.cn/))这个图床 可以自己改 问问GPT GEMINI那些可以改好的
- 需要的东西 我已经在上面的步骤补齐了 那些IMGURL PICGO可以乱填 但是PICUI一定要好好填

## 使用方法

1. **访问网站**：
   - 打开部署后的 URL（例如 `https://your-project.vercel.app`）。
   - 页面显示一个简单的表单，包含名称输入框、图片选择器和上传按钮。

2. **上传图片**：
   - 在 “名称” 输入框中输入一个唯一的名称（例如 `my_image`）。
   - 点击 “选择文件” 选择一张图片（支持 JPEG、PNG 等格式）。
   - 点击 “上传” 按钮。

3. **查看结果**：
   - 上传成功后，页面将显示成功消息，包含名称和图片 URL。
   - 如果名称已存在或上传失败，页面将显示错误消息。
   - 成功上传后，检查 GitHub Gist 的 `icons.json`，确认新条目已追加到 `icons` 数组。

4. **移动端使用**：
   - 页面已优化为移动端友好，支持触摸操作。
   - 在手机浏览器中打开 URL，操作与桌面端相同。

## 项目文件说明

- **api/index.py**：Flask 后端，处理图片上传和 Gist 更新。
- **templates/index.html**：前端页面，包含上传表单。
- **static/css/style.css**：CSS 样式，适配移动端。
- **static/js/script.js**：JavaScript 脚本，处理前端上传逻辑。
- **requirements.txt**：列出 Flask 和 requests 依赖。
- **vercel.json**：Vercel 配置文件，定义构建和路由规则。

## 配置选项

- **上传服务选择**：
  - 通过设置 `UPLOAD_SERVICE` 环境变量来选择上传服务：
    - `PICGO`（默认）：使用 PicGo API 上传
    - `IMGURL`：使用 ImgURL API 上传
  - 如果未设置此变量，默认使用 PicGo 服务

- **PicGo 服务相关环境变量**：
  - `PICGO_API_KEY`：你的 PicGo API 密钥

- **ImgURL 服务相关环境变量**：
  - `IMGURL_API_UID`：从 ImgURL 后台获取的 UID
  - `IMGURL_API_TOKEN`：从 ImgURL 后台获取的 TOKEN
  - `IMGURL_ALBUM_ID`：相册 ID（可选，如果不使用相册功能可以留空）

- **GitHub Gist 相关环境变量**：
  - `GIST_ID`：你的 Gist ID
  - `GITHUB_USER`：你的 GitHub 用户名
  - `GITHUB_TOKEN`：你的 GitHub Personal Access Token

## 注意事项

- **安全性**：
  - 不要在代码中硬编码任何敏感信息如 API 密钥或令牌，始终使用环境变量。
  - 确保 GitHub Token 仅具有 `gist` 权限以降低风险。
- **错误处理**：
  - 名称重复、API 失败或服务器错误会返回清晰的错误消息。
  - 检查 Vercel 日志以调试部署问题。
- **Vercel 配置**：
  - 如果遇到 Python 版本问题，可在 Vercel 项目设置中指定 Node.js 版本为 18.x。
  - 确保 `requirements.txt` 包含所有依赖。
- **扩展功能**：
  - 可添加图片预览功能（修改 `script.js` 和 `index.html`）。
  - 可扩展为多用户系统，增加用户认证。

## 故障排查

- **部署失败**：检查 Vercel 日志，确保环境变量正确设置，`requirements.txt` 无误。
- **上传失败**：
  - 确认 `PICGO_API_KEY` 有效。
  - 检查 Gist 是否存在且 `GITHUB_TOKEN` 有 `gist` 权限。
- **页面不显示**：验证 `vercel.json` 中的路由配置，确保静态文件正确加载。
