from flask import Flask, request, jsonify, render_template, Response
import requests
import os
import json
import random
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

app = Flask(__name__,
            static_folder=os.path.join(os.path.dirname(__file__), '../static'),
            template_folder=os.path.join(os.path.dirname(__file__), '../templates'))

# ===== Custom AI (模式2：解锁后使用) =====
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev_secret_change_me')
serializer = URLSafeTimedSerializer(app.secret_key)
CUSTOM_AI_ENABLED = os.getenv('CUSTOM_AI_ENABLED', '0').strip() == '1'
CUSTOM_AI_PASSWORD = os.getenv('CUSTOM_AI_PASSWORD', '').strip()

# PicGo API 配置
PICGO_API_URL = "https://www.picgo.net/api/1/upload"
PICGO_API_KEY = os.getenv("PICGO_API_KEY", "YOUR_API_KEY")  # 替换为你的 PicGo API 密钥

# ImgURL API 配置
IMGURL_API_URL = "https://www.imgurl.org/api/v2/upload"  # 默认为 imgurl.org，可替换为其他服务商
IMGURL_API_UID = os.getenv("IMGURL_API_UID", "YOUR_IMGURL_UID")  # 从环境变量获取 ImgURL UID
IMGURL_API_TOKEN = os.getenv("IMGURL_API_TOKEN", "YOUR_IMGURL_TOKEN")  # 从环境变量获取 ImgURL TOKEN

# PICUI API 配置（强制 Token 模式）
PICUI_UPLOAD_URL = "https://picui.cn/api/v1/upload"
PICUI_TOKEN = os.getenv("PICUI_TOKEN", "").strip()

# GitHub Gist 配置
GIST_ID = os.getenv("GIST_ID", "YOUR_GIST_ID")  # 替换为你的 Gist ID
GITHUB_USER = os.getenv("GITHUB_USER", "YOUR_GITHUB_USER")  # 替换为你的 GITHUB USER
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "YOUR_GITHUB_TOKEN")  # 替换为你的 GitHub Token
GIST_FILE_NAME = "icons.json"

# 如果选择 PICUI 作为上传服务，则强制要求配置 Token
if os.getenv("UPLOAD_SERVICE", "").upper() == "PICUI" and not PICUI_TOKEN:
    print("警告：UPLOAD_SERVICE=PICUI 但 PICUI_TOKEN 未配置，PICUI 上传将全部失败（强制 Token 模式）")

# ===== 新增：批量上传缓存 & Gist 读取/更新工具函数 =====
uploaded_cache = []  # 用于批量上传时先缓存然后一次性写入 Gist


def get_gist_data():
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    r = requests.get(f"https://api.github.com/gists/{GIST_ID}", headers=headers, timeout=30)
    r.raise_for_status()
    return r.json()


def update_gist_data(content):
    """更新 Gist 数据（替换整个 icons.json 文件内容）"""
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
    }
    data = {"files": {GIST_FILE_NAME: {"content": json.dumps(content, indent=2)}}}
    response = requests.patch(f"https://api.github.com/gists/{GIST_ID}", json=data, headers=headers, timeout=30)
    if response.status_code != 200:
        raise Exception(f"更新 Gist 失败：{response.text}")
    return response.json()


# ===== 上传实现（更稳健的网络调用：超时 & raise_for_status） =====

def upload_to_picgo(img):
    headers = {"X-API-Key": PICGO_API_KEY}
    files = {"source": (img.filename, img.stream, img.mimetype)}
    r = requests.post(PICGO_API_URL, files=files, headers=headers, timeout=30)
    r.raise_for_status()
    j = r.json()
    return (j.get("image") or {}).get("url", None)


def upload_to_imgurl(img):
    form = {"uid": IMGURL_API_UID, "token": IMGURL_API_TOKEN}
    files = {"file": (img.filename, img.stream, img.mimetype)}
    r = requests.post(IMGURL_API_URL, data=form, files=files, timeout=30)
    r.raise_for_status()
    j = r.json()
    # 一般返回 { code, data: { url } }
    if "data" in j and "url" in j["data"]:
        return j["data"]["url"]
    if "url" in j:
        return j["url"]
    return None


# 保持兼容：PICUI 上传实现（未改动业务逻辑）
def upload_to_picui(image):
    token = os.getenv("PICUI_TOKEN", "").strip()
    if not token:
        raise Exception("PICUI_TOKEN 为空：已启用强制 Token 上传模式，无法游客上传")

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
    }

    files = {
        "file": (image.filename, image.stream, image.mimetype)
    }

    data = {}

    permission = os.getenv("PICUI_PERMISSION", "0").strip()
    if permission:
        data["permission"] = permission

    strategy_id = os.getenv("PICUI_STRATEGY_ID", "").strip()
    if strategy_id:
        data["strategy_id"] = strategy_id

    album_id = os.getenv("PICUI_ALBUM_ID", "").strip()
    if album_id:
        data["album_id"] = album_id

    expired_at = os.getenv("PICUI_EXPIRED_AT", "").strip()
    if expired_at:
        data["expired_at"] = expired_at

    try:
        r = requests.post(PICUI_UPLOAD_URL, headers=headers, data=data, files=files, timeout=30)

        if r.status_code in (401, 403):
            print("PICUI token 无效或权限不足：", r.status_code, r.text)
            return None

        if r.status_code != 200:
            print("PICUI 上传失败：", r.status_code, r.text)
            return None

        j = r.json()

        if not j.get("status"):
            print("PICUI 业务错误：", j)
            return None

        return j["data"]["links"]["url"]

    except Exception as e:
        print("PICUI 异常：", e)
        return None


# 名称去重逻辑（保留原来的实现，但更稳）
def get_unique_name(name, json_content):
    icons = json_content.get("icons", [])
    if not any(icon["name"] == name for icon in icons):
        return name

    base_name = name
    counter = 1
    while any(icon["name"] == f"{base_name}{counter}" for icon in icons):
        counter += 1
    return f"{base_name}{counter}"


# 批量上传合并提交
def finalize_batch_update():
    global uploaded_cache
    if not uploaded_cache:
        return {"success": False, "error": "没有批量上传内容"}
    try:
        gist = get_gist_data()
        icons_raw = gist.get("files", {}).get(GIST_FILE_NAME, {}).get("content", "{}")
        content = json.loads(icons_raw) if isinstance(icons_raw, str) else icons_raw
        for item in uploaded_cache:
            name = get_unique_name(item["name"], content)
            content.setdefault("icons", []).append({"name": name, "url": item["url"]})
        update_gist_data(content)
        uploaded_cache = []
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ===================== AI 抠图（默认双通道负载 + 自定义模式2） =====================

def call_clipdrop_remove_bg(image):
    api_key = os.getenv("CLIPDROP_API_KEY", "").strip()
    if not api_key:
        raise Exception("CLIPDROP_API_KEY 未配置")

    url = "https://clipdrop-api.co/remove-background/v1"
    headers = {"x-api-key": api_key}
    files = {"image_file": (image.filename, image.stream, image.mimetype)}
    r = requests.post(url, headers=headers, files=files, timeout=60)
    if r.status_code != 200:
        raise Exception(f"Clipdrop 抠图失败: HTTP {r.status_code} {r.text[:200]}")
    return r.content  # png bytes


def call_removebg_remove_bg(image):
    api_key = os.getenv("REMOVEBG_API_KEY", "").strip()
    if not api_key:
        raise Exception("REMOVEBG_API_KEY 未配置")

    url = "https://api.remove.bg/v1.0/removebg"
    headers = {"X-Api-Key": api_key}
    files = {"image_file": (image.filename, image.stream, image.mimetype)}
    data = {"size": "auto"}
    r = requests.post(url, headers=headers, files=files, data=data, timeout=60)
    if r.status_code != 200:
        raise Exception(f"remove.bg 抠图失败: HTTP {r.status_code} {r.text[:200]}")
    return r.content  # png bytes


def call_custom_remove_bg(image):
    custom_url = os.getenv("CUSTOM_AI_URL", "").strip()
    if not custom_url:
        raise Exception("CUSTOM_AI_URL 未配置")

    file_field = os.getenv("CUSTOM_AI_FILE_FIELD", "image").strip() or "image"
    auth_header = os.getenv("CUSTOM_AI_AUTH_HEADER", "Authorization").strip() or "Authorization"
    auth_prefix = os.getenv("CUSTOM_AI_AUTH_PREFIX", "").strip()
    api_key = os.getenv("CUSTOM_AI_API_KEY", "").strip()

    headers = {}
    if api_key:
        headers[auth_header] = f"{auth_prefix}{api_key}"

    files = {file_field: (image.filename, image.stream, image.mimetype)}
    r = requests.post(custom_url, headers=headers, files=files, timeout=90)
    if r.status_code != 200:
        raise Exception(f"自定义AI抠图失败: HTTP {r.status_code} {r.text[:200]}")
    return r.content


@app.route("/")
def home():
    return render_template("index.html", github_user=GITHUB_USER, gist_id=GIST_ID)


@app.route("/editor")
def editor():
    return render_template("editor.html", custom_ai_enabled=CUSTOM_AI_ENABLED)


@app.route("/api/upload", methods=["POST"])
def upload_image():
    try:
        images = request.files.getlist("source")
        if not images:
            return jsonify({"error": "缺少图片"}), 400

        raw_name = (request.form.get("name") or "").strip()
        upload_service = os.getenv("UPLOAD_SERVICE", "PICGO").upper()

        results = []
        for image in images:
            if not image or not getattr(image, "filename", ""):
                continue

            auto_name = os.path.splitext(image.filename)[0]
            name = raw_name or auto_name

            try:
                if upload_service == "IMGURL":
                    image_url = upload_to_imgurl(image)

                elif upload_service == "PICUI":
                    if not os.getenv("PICUI_TOKEN", "").strip():
                        results.append({
                            "ok": False,
                            "name": name,
                            "error": "PICUI_TOKEN 未配置，已启用强制 Token 上传模式"
                        })
                        continue
                    image_url = upload_to_picui(image)

                else:
                    image_url = upload_to_picgo(image)

            except Exception as e:
                results.append({"ok": False, "name": name, "error": f"上传失败：{str(e)}"})
                continue

            if not image_url:
                results.append({
                    "ok": False,
                    "name": name,
                    "error": f"图片上传失败（{upload_service}）"
                })
                continue

            # 将上传结果先缓存，使用 finalize_batch_update 在批量场景统一写入 Gist
            uploaded_cache.append({"name": name, "url": image_url})

            # 为了兼容原来的单图立即更新场景，仍然尝试立即更新一次（失败不阻塞批量提交）
            try:
                # 获取当前 gist 内容并更新（使用新的 update_gist_data 工具）
                gist = get_gist_data()
                icons_raw = gist.get("files", {}).get(GIST_FILE_NAME, {}).get("content", "{}")
                content = json.loads(icons_raw) if isinstance(icons_raw, str) else icons_raw
                unique = get_unique_name(name, content)
                content.setdefault("icons", []).append({"name": unique, "url": image_url})
                update_gist_data(content)
                results.append({"ok": True, "name": unique, "url": image_url})
            except Exception as e:
                # 如果即时更新失败，保留在缓存等待 finalize_batch_update
                results.append({"ok": True, "name": name, "url": image_url, "warning": f"Gist 更新失败，已缓存：{str(e)}"})

        if not results:
            return jsonify({"error": "没有可用的图片文件"}), 400

        if len(results) == 1:
            r = results[0]
            if r.get("ok"):
                return jsonify({"success": True, "name": r.get("name")}), 200
            return jsonify({"error": r.get("error")}), 400

        return jsonify({"success": True, "results": results}), 200

    except Exception as e:
        return jsonify({"error": "服务器错误", "details": str(e)}), 500


@app.route("/api/finalize_batch", methods=["POST"])
def api_finalize_batch():
    """手动触发将缓存的批量上传写入 Gist（如果某些即时更新失败或想延后合并）"""
    res = finalize_batch_update()
    if res.get("success"):
        return jsonify({"success": True}), 200
    return jsonify({"error": res.get("error")}), 500


# 原有 AI 抠图路由与逻辑保持不变
@app.route("/api/ai_cutout", methods=["POST"])
def api_ai_cutout_default():
    try:
        image = request.files.get("image")
        if not image:
            return jsonify({"error": "缺少图片字段 image"}), 400

        candidates = []
        if os.getenv("CLIPDROP_API_KEY", "").strip():
            candidates.append(("clipdrop", call_clipdrop_remove_bg))
        if os.getenv("REMOVEBG_API_KEY", "").strip():
            candidates.append(("removebg", call_removebg_remove_bg))

        if not candidates:
            return jsonify({"error": "默认AI未配置：请设置 CLIPDROP_API_KEY 或 REMOVEBG_API_KEY"}), 500

        random.shuffle(candidates)

        last_err = None
        for name, fn in candidates:
            try:
                png_bytes = fn(image)
                return Response(png_bytes, mimetype="image/png")
            except Exception as e:
                last_err = f"{name}: {str(e)}"
                continue

        return jsonify({"error": "默认AI抠图失败", "details": last_err}), 500

    except Exception as e:
        return jsonify({"error": "默认AI抠图失败", "details": str(e)}), 500


@app.route("/api/ai/custom/auth", methods=["POST"])
def api_custom_ai_auth():
    if not CUSTOM_AI_ENABLED:
        return jsonify({"error": "自定义AI未启用（CUSTOM_AI_ENABLED!=1）"}), 403

    if not CUSTOM_AI_PASSWORD:
        return jsonify({"error": "CUSTOM_AI_PASSWORD 未配置"}), 500

    data = request.get_json(silent=True) or {}
    pwd = (data.get("password") or "").strip()

    if pwd != CUSTOM_AI_PASSWORD:
        return jsonify({"error": "密码错误"}), 403

    token = serializer.dumps({"ok": 1})
    resp = jsonify({"success": True})
    resp.set_cookie("custom_ai_auth", token, max_age=86400, httponly=True, samesite="Lax", secure=True)
    return resp


def _check_custom_ai_cookie():
    raw = request.cookies.get("custom_ai_auth", "")
    if not raw:
        return False
    try:
        serializer.loads(raw, max_age=86400)
        return True
    except (BadSignature, SignatureExpired):
        return False


@app.route("/api/ai_cutout_custom", methods=["POST"])
def api_ai_cutout_custom():
    try:
        if not CUSTOM_AI_ENABLED:
            return jsonify({"error": "自定义AI未启用（CUSTOM_AI_ENABLED!=1）"}), 403

        if not _check_custom_ai_cookie():
            return jsonify({"error": "未解锁自定义AI：请先输入密码解锁"}), 403

        image = request.files.get("image")
        if not image:
            return jsonify({"error": "缺少图片字段 image"}), 400

        png_bytes = call_custom_remove_bg(image)
        return Response(png_bytes, mimetype="image/png")

    except Exception as e:
        return jsonify({"error": "自定义AI抠图失败", "details": str(e)}), 500


if __name__ == "__main__":
    app.run()
