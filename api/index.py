from flask import Flask, request, jsonify, render_template
import requests
import os
import json

app = Flask(__name__,
            static_folder=os.path.join(os.path.dirname(__file__), '../static'),
            template_folder=os.path.join(os.path.dirname(__file__), '../templates'))

# PicGo API 配置
PICGO_API_URL = "https://www.picgo.net/api/1/upload"
PICGO_API_KEY = os.getenv("PICGO_API_KEY", "YOUR_API_KEY")  # 替换为你的 PicGo API 密钥

# ImgURL API 配置
IMGURL_API_URL = "https://www.imgurl.org/api/v2/upload"  # 默认为 imgurl.org，可替换为其他服务商
IMGURL_API_UID = os.getenv("IMGURL_API_UID", "YOUR_API_UID")  # 从环境变量获取 ImgURL UID
IMGURL_API_TOKEN = os.getenv("IMGURL_API_TOKEN", "YOUR_API_TOKEN")  # 从环境变量获取 ImgURL TOKEN

# GitHub Gist 配置
GIST_ID = os.getenv("GIST_ID", "YOUR_GIST_ID")  # 替换为你的 Gist ID
GITHUB_USER = os.getenv("GITHUB_USER", "YOUR_GITHUB_USER")  # 替换为你的 GITHUB USER
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "YOUR_GITHUB_TOKEN")  # 替换为你的 GitHub Token
GIST_FILE_NAME = "icons.json"


@app.route("/")
def home():
    return render_template("index.html", github_user=GITHUB_USER, gist_id=GIST_ID)


@app.route("/api/upload", methods=["POST"])
def upload_image():
    try:
        # 获取表单数据
        image = request.files.get("source")
        name = request.form.get("name")

        if not image or not name:
            return jsonify({"error": "缺少图片或名称"}), 400

               # 根据环境变量决定使用哪个上传接口
        upload_service = os.getenv("UPLOAD_SERVICE", "PICGO").upper()
        if upload_service == "IMGURL":
            image_url = upload_to_imgurl(image)
        elif upload_service == "PICUI":
            image_url = upload_to_picui(image)
        else:
            image_url = upload_to_picgo(image)

        if not image_url:
            return jsonify({"error": "图片上传失败", "details": f"使用 {upload_service} 服务上传失败"}), 500

        # 更新 Gist
        gist_result = update_gist(name, image_url)
        if not gist_result["success"]:
            return jsonify({"error": gist_result["error"]}), 400

        return jsonify({"success": True, "name": gist_result["name"]}), 200

    except Exception as e:
        return jsonify({"error": "服务器错误", "details": str(e)}), 500


def upload_to_picgo(image):
    """使用 PicGo API 上传图片"""
    form_data = {"source": (image.filename, image.stream, image.mimetype)}
    headers = {"X-API-Key": PICGO_API_KEY}
    upload_response = requests.post(PICGO_API_URL, files=form_data, headers=headers)

    if upload_response.status_code != 200:
        print(f"PicGo 上传失败: {upload_response.json().get('error').get('message') if upload_response.headers.get('Content-Type', '').startswith('application/json') else upload_response.text}")
        return None

    upload_data = upload_response.json()
    return upload_data.get("image").get("url")


def upload_to_imgurl(image):
    """使用 ImgURL API 上传图片"""
    # 准备表单数据 - 确保按正确的顺序传递参数
    form_data = {
        'uid': IMGURL_API_UID,
        'token': IMGURL_API_TOKEN
    }

    # 如果设置了相册ID，也添加进去
    album_id = os.getenv("IMGURL_ALBUM_ID")  # 将默认值设为字符串
    if album_id and str(album_id).strip():
        form_data['album_id'] = album_id

    # 最后添加文件字段
    files = {
        'file': (image.filename, image.stream, image.mimetype)
    }

    print(f"准备上传数据: uid={IMGURL_API_UID}, token={'*' * len(IMGURL_API_TOKEN)}, album_id={album_id}")

    try:
        # 发送POST请求，分别传递form_data和files
        upload_response = requests.post(IMGURL_API_URL, data=form_data, files=files)

        print(f"HTTP状态码: {upload_response.status_code}")
        print(f"响应内容: {upload_response.text}")

        # 检查HTTP响应状态码
        if upload_response.status_code != 200:
            print(f"ImgURL 上传失败，HTTP状态码: {upload_response.status_code}, 响应: {upload_response.text}")
            return None

        try:
            upload_data = upload_response.json()
            
            # 检查API返回的业务状态码
            if isinstance(upload_data, dict) and 'code' in upload_data:
                if upload_data['code'] != 200:
                    print(f"ImgURL API 返回错误: {upload_data}")
                    return None
            
            # 解析成功响应的数据
            if 'data' in upload_data and 'url' in upload_data['data']:
                return upload_data['data']['url']
            elif 'url' in upload_data:
                return upload_data['url']
            else:
                print(f"ImgURL 响应格式异常: {upload_data}")
                return None
        except ValueError:
            print(f"ImgURL 响应不是有效的 JSON: {upload_response.text}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"请求异常: {str(e)}")
        return None


def get_unique_name(name, json_content):
    """
    检查 json_content["icons"] 中是否已有名称为 name 的图标，
    如果存在重复，则在名称后缀添加递增数字，直到不重复。
    返回唯一名称。
    """
    icons = json_content.get("icons", [])
    if not any(icon["name"] == name for icon in icons):
        return name

    base_name = name
    counter = 1
    while any(icon["name"] == f"{base_name}{counter}" for icon in icons):
        counter += 1
    return f"{base_name}{counter}"


def update_gist(name, url):
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }

    # 获取当前 Gist 内容
    gist_response = requests.get(f"https://api.github.com/gists/{GIST_ID}", headers=headers)
    if gist_response.status_code != 200:
        return {"success": False, "error": "无法获取 Gist"}

    gist_data = gist_response.json()
    try:
        json_content = json.loads(gist_data["files"][GIST_FILE_NAME]["content"])
    except:
        json_content = {"name": "Forward", "description": "", "icons": []}

    name = get_unique_name(name, json_content)

    # 添加新图标
    json_content["icons"].append({"name": name, "url": url})

    # 更新 Gist
    update_response = requests.patch(
        f"https://api.github.com/gists/{GIST_ID}",
        headers=headers,
        json={"files": {GIST_FILE_NAME: {"content": json.dumps(json_content, indent=2)}}},
    )

    if update_response.status_code != 200:
        return {"success": False, "error": "无法更新 Gist"}

    return {"success": True, "name": name}
            
def upload_to_picui(image):
    url = "https://picui.cn/api/upload"          # 保持官方路径
    files = {"image": (image.filename, image.stream, image.mimetype)}
    token = os.getenv("PICUI_TOKEN", "").strip()
    if not token:
        print("PICUI_TOKEN 为空，无法上传")
        return None
    headers = {"Authorization": f"Bearer {token}"}
    try:
        r = requests.post(url, files=files, headers=headers, timeout=15)
        if r.status_code != 200:
            print("picui 上传失败", r.status_code, r.text)
            return None
        data = r.json()
        if data.get("code") == 200:
            return data["data"]["url"]
        print("picui 业务错误", data)
    except Exception as e:
        print("picui 异常", e)
    return None

if __name__ == "__main__":
    app.run()


