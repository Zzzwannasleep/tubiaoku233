from flask import Flask, request, jsonify, render_template, Response, url_for
import requests
import os
import json
import random
import time
from functools import wraps
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

app = Flask(__name__,
            static_folder=os.path.join(os.path.dirname(__file__), '../static'),
            template_folder=os.path.join(os.path.dirname(__file__), '../templates'))

# ===== Custom AI (模式2：解锁后使用) =====
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'dev_secret_change_me')
serializer = URLSafeTimedSerializer(app.secret_key)
CUSTOM_AI_ENABLED = os.getenv('CUSTOM_AI_ENABLED', '0').strip() == '1'
CUSTOM_AI_PASSWORD = os.getenv('CUSTOM_AI_PASSWORD', '').strip()

# ===== Admin 管理后台（独立 manage 页 + 密码登录）=====
ADMIN_ENABLED = os.getenv("ADMIN_ENABLED", "0").strip() == "1"
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "").strip()
ADMIN_COOKIE_MAX_AGE = int((os.getenv("ADMIN_COOKIE_MAX_AGE", "86400") or "86400").strip())

def _set_admin_cookie(resp):
    token = serializer.dumps({"admin": 1})
    resp.set_cookie(
        "admin_auth",
        token,
        max_age=ADMIN_COOKIE_MAX_AGE,
        httponly=True,
        samesite="Lax",
        secure=True,  # 线上 https
    )
    return resp

def _check_admin_cookie():
    raw = request.cookies.get("admin_auth", "")
    try:
        serializer.loads(raw, max_age=ADMIN_COOKIE_MAX_AGE)
        return True
    except (BadSignature, SignatureExpired):
        return False
    except Exception:
        return False

def require_admin(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not ADMIN_ENABLED:
            return jsonify({"ok": False, "message": "Admin disabled"}), 403
        if not _check_admin_cookie():
            return jsonify({"ok": False, "message": "Unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper

# ===== 随机二次元背景 API（管理页/编辑页统一用）=====
RANDOM_BG_API = os.getenv("RANDOM_BG_API", "https://api.btstu.cn/sjbz/?lx=dongman").strip()

# PicGo API 配置
PICGO_API_URL = "https://www.picgo.net/api/1/upload"
PICGO_API_KEY = os.getenv("PICGO_API_KEY", "YOUR_API_KEY")

# ImgURL API 配置
IMGURL_API_URL = "https://www.imgurl.org/api/v2/upload"
IMGURL_API_UID = os.getenv("IMGURL_API_UID", "YOUR_IMGURL_UID")
IMGURL_API_TOKEN = os.getenv("IMGURL_API_TOKEN", "YOUR_IMGURL_TOKEN")

# PICUI API 配置
PICUI_UPLOAD_URL = "https://picui.cn/api/v1/upload"
PICUI_TOKEN = os.getenv("PICUI_TOKEN", "").strip()

# GitHub Gist 配置
GIST_ID = os.getenv("GIST_ID", "YOUR_GIST_ID")
GITHUB_USER = os.getenv("GITHUB_USER", "YOUR_GITHUB_USER")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "YOUR_GITHUB_TOKEN")
GIST_FILE_NAME = "icons.json"

# 警告检查
if os.getenv("UPLOAD_SERVICE", "").upper() == "PICUI" and not PICUI_TOKEN:
    print("警告：UPLOAD_SERVICE=PICUI 但 PICUI_TOKEN 未配置，PICUI 上传将全部失败（强制 Token 模式）")

# ===== Gist 读取/更新工具函数 =====

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

def _update_gist_with_retry(content, max_retry=3):
    """对 Gist PATCH 做指数退避重试，缓解偶发失败/流控"""
    last_err = None
    for i in range(max_retry):
        try:
            return update_gist_data(content)
        except Exception as e:
            last_err = e
            time.sleep(2 ** i)  # 1s,2s,4s
    raise last_err

def _read_icons_json_from_gist():
    gist = get_gist_data()
    icons_raw = gist.get("files", {}).get(GIST_FILE_NAME, {}).get("content", "{}")
    content = json.loads(icons_raw) if isinstance(icons_raw, str) else icons_raw
    if not isinstance(content, dict):
        content = {}
    if "icons" not in content or not isinstance(content.get("icons"), list):
        content["icons"] = []
    return content

def get_unique_name(name, json_content):
    """名称去重逻辑"""
    icons = json_content.get("icons", [])
    if not any(icon["name"] == name for icon in icons):
        return name

    base_name = name
    counter = 1
    while any(icon["name"] == f"{base_name}{counter}" for icon in icons):
        counter += 1
    return f"{base_name}{counter}"

def batch_append_to_gist(new_items):
    """
    一次性将 new_items 列表追加到 Gist
    new_items: [{"name": "raw_name", "url": "http..."}]
    Return: 更新后的 items (包含去重后的最终名称)
    """
    try:
        content = _read_icons_json_from_gist()
        saved_chunk = []

        for item in new_items:
            final_name = get_unique_name(item["name"], content)
            content.setdefault("icons", []).append({
                "name": final_name,
                "url": item["url"]
            })
            saved_chunk.append({"name": final_name, "url": item["url"]})

        _update_gist_with_retry(content)
        return saved_chunk
    except Exception as e:
        print(f"Gist 批量更新失败: {e}")
        raise e

def gist_remove_icons_by_urls(urls_to_remove: set):
    """
    从 icons.json 中批量移除 url 命中的条目，并尽量合并为一次 PATCH。
    一致性保证：urls_to_remove 必须只包含“PICUI 删除成功”的 URL
    """
    urls_to_remove = set([u for u in (urls_to_remove or set()) if u])
    content = _read_icons_json_from_gist()
    icons = content.get("icons", []) or []
    before = len(icons)

    new_icons = [it for it in icons if it.get("url") not in urls_to_remove]
    after = len(new_icons)

    content["icons"] = new_icons
    if after != before:
        _update_gist_with_retry(content)

    return {"before": before, "after": after, "removed": before - after}

def gist_raw_icons_url():
    return f"https://gist.githubusercontent.com/{GITHUB_USER}/{GIST_ID}/raw/{GIST_FILE_NAME}"

# ===== 对外暴露带 .json 后缀的订阅地址（同域名，便于客户端识别）=====
@app.get("/icons.json")
def icons_json():
    try:
        content = _read_icons_json_from_gist()
        # 使用 Response 而不是 jsonify，保证缩进 & Content-Type=application/json
        return Response(json.dumps(content, ensure_ascii=False, indent=2), mimetype="application/json")
    except Exception as e:
        return jsonify({"error": "无法读取 icons.json", "details": str(e)}), 500

# ===== 图片上传实现 =====

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
    if "data" in j and "url" in j["data"]:
        return j["data"]["url"]
    if "url" in j:
        return j["url"]
    return None

def upload_to_picui(image):
    token = os.getenv("PICUI_TOKEN", "").strip()
    if not token:
        raise Exception("PICUI_TOKEN 为空：已启用强制 Token 上传模式")

    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
    }
    files = {"file": (image.filename, image.stream, image.mimetype)}
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
        if r.status_code != 200:
            print("PICUI 上传失败：", r.status_code, r.text)
            return None
        j = r.json()
        if not j.get("status"):
            return None
        return j["data"]["links"]["url"]
    except Exception as e:
        print("PICUI 异常：", e)
        return None

# ===== Admin 后台：PICUI 列表/删除接口封装 =====
PICUI_API_BASE = "https://picui.cn/api/v1"

def _picui_headers():
    token = os.getenv("PICUI_TOKEN", "").strip()
    if not token:
        raise Exception("PICUI_TOKEN 未配置：无法访问 PICUI 管理接口")
    return {"Accept": "application/json", "Authorization": f"Bearer {token}"}

def picui_list_images(page=1, q=None):
    params = {"page": page}
    if q:
        params["q"] = q
    r = requests.get(f"{PICUI_API_BASE}/images", headers=_picui_headers(), params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def picui_delete_by_key(key: str):
    r = requests.delete(f"{PICUI_API_BASE}/images/{key}", headers=_picui_headers(), timeout=30)
    r.raise_for_status()
    return r.json()

# ===================== 路由逻辑 =====================

@app.route("/")
def home():
    return render_template("index.html", github_user=GITHUB_USER, gist_id=GIST_ID)

@app.route("/editor")
def editor():
    # 如果你 editor.html 没用 bg_api 也不影响；用的话就是二次元随机背景
    return render_template("editor.html", custom_ai_enabled=CUSTOM_AI_ENABLED, bg_api=RANDOM_BG_API)

# ===== 独立 manage 页面 =====

@app.get("/manage")
def manage_page():
    if not ADMIN_ENABLED:
        return "Admin disabled", 403
    return render_template("manage.html", bg_api=RANDOM_BG_API, gist_raw=url_for("icons_json"))

# ===== Admin API =====

@app.post("/api/admin/login")
def api_admin_login():
    if not ADMIN_ENABLED:
        return jsonify({"ok": False, "message": "Admin disabled"}), 403
    data = request.get_json(silent=True) or {}
    pwd = (data.get("password") or "").strip()
    if not ADMIN_PASSWORD:
        return jsonify({"ok": False, "message": "ADMIN_PASSWORD 未配置"}), 500
    if pwd != ADMIN_PASSWORD:
        return jsonify({"ok": False, "message": "密码错误"}), 403
    resp = jsonify({"ok": True})
    return _set_admin_cookie(resp)

@app.post("/api/admin/logout")
@require_admin
def api_admin_logout():
    resp = jsonify({"ok": True})
    resp.delete_cookie("admin_auth")
    return resp

@app.get("/api/admin/images")
@require_admin
def api_admin_images():
    """
    方案 A：管理页 1 页 = PICUI 的 1 页
    - page: PICUI 页码
    - q: 可选搜索
    """
    page = int(request.args.get("page", "1"))
    q = (request.args.get("q") or "").strip() or None

    pj = picui_list_images(page=page, q=q)

    # 读一次 Gist（只读，不写）
    content = _read_icons_json_from_gist()
    icons = content.get("icons", []) or []
    by_url = {it.get("url"): it for it in icons if it.get("url")}
    raw_url = url_for("icons_json", _external=True)

    data_obj = (pj.get("data", {}) or {})
    data_list = data_obj.get("data") or []
    per_page = data_obj.get("per_page")
    last_page = data_obj.get("last_page")
    total = data_obj.get("total")

    items = []
    for img in (data_list or []):
        key = img.get("key") or img.get("id") or ""
        links = img.get("links") or {}
        url = links.get("url") or img.get("url") or ""
        icon = by_url.get(url)
        items.append({
            "key": key,
            "url": url,
            "in_gist": bool(icon),
            "icon_name": (icon.get("name") if icon else None),
        })

    return jsonify({
        "ok": True,
        "page": page,
        "items": items,
        "picui": {
            "per_page": per_page,
            "last_page": last_page,
            "total": total
        },
        "raw_icons_json": raw_url,
        "gist_stats": {"count": len(icons)}
    })

@app.post("/api/admin/delete")
@require_admin
def api_admin_delete():
    """
    一致性保证（你要求的）：
    - 先删 PICUI
    - 只有 PICUI 删除成功的，才从 icons.json 移除
    - 批量删除：Gist 更新合并为一次 PATCH
    """
    data = request.get_json(silent=True) or {}
    items = data.get("items") or []
    if not isinstance(items, list) or not items:
        return jsonify({"ok": False, "message": "items 不能为空"}), 400

    picui_results = []
    urls_to_remove = set()

    for it in items:
        key = (it.get("key") or "").strip()
        url = (it.get("url") or "").strip()

        if not key:
            picui_results.append({"ok": False, "key": key, "url": url, "error": "missing key"})
            continue

        try:
            picui_delete_by_key(key)
            picui_results.append({"ok": True, "key": key, "url": url})
            if url:
                urls_to_remove.add(url)  # 关键：只收集成功的
        except Exception as e:
            picui_results.append({"ok": False, "key": key, "url": url, "error": str(e)})

    gist_summary = {"before": None, "after": None, "removed": 0}
    if urls_to_remove:
        gist_summary = gist_remove_icons_by_urls(urls_to_remove)

    return jsonify({"ok": True, "picui": picui_results, "gist": gist_summary})

# ===== 上传接口（保持你的逻辑不变）=====

@app.route("/api/upload", methods=["POST"])
def upload_image():
    """
    1. 单图上传：立即更新 Gist。
    2. 批量上传：每积攒 10 张图的链接，更新一次 Gist（流控）。
    3. 剩余不足 10 张：最后统一更新。
    """
    try:
        images = request.files.getlist("source")
        if not images:
            return jsonify({"error": "缺少图片"}), 400

        raw_name = (request.form.get("name") or "").strip()
        upload_service = os.getenv("UPLOAD_SERVICE", "PICGO").upper()

        final_results = []
        pending_batch = []
        BATCH_SIZE = 10

        for image in images:
            if not image or not getattr(image, "filename", ""):
                continue

            auto_name = os.path.splitext(image.filename)[0]
            name = raw_name or auto_name

            upload_err = None
            image_url = None

            try:
                if upload_service == "IMGURL":
                    image_url = upload_to_imgurl(image)
                elif upload_service == "PICUI":
                    if not os.getenv("PICUI_TOKEN", "").strip():
                        upload_err = "PICUI_TOKEN 未配置"
                    else:
                        image_url = upload_to_picui(image)
                else:
                    image_url = upload_to_picgo(image)
            except Exception as e:
                upload_err = str(e)

            if not image_url:
                final_results.append({
                    "ok": False,
                    "name": name,
                    "error": upload_err or f"图片上传失败（{upload_service}）"
                })
            else:
                pending_batch.append({"name": name, "url": image_url})

            if len(pending_batch) >= BATCH_SIZE:
                try:
                    saved_items = batch_append_to_gist(pending_batch)
                    for item in saved_items:
                        final_results.append({"ok": True, "name": item["name"], "url": item["url"]})
                    pending_batch = []
                except Exception as e:
                    for item in pending_batch:
                        final_results.append({
                            "ok": True,
                            "name": item["name"],
                            "url": item["url"],
                            "warning": f"图片已上传但 Gist 阶段同步失败: {str(e)}"
                        })
                    pending_batch = []

        if pending_batch:
            try:
                saved_items = batch_append_to_gist(pending_batch)
                for item in saved_items:
                    final_results.append({"ok": True, "name": item["name"], "url": item["url"]})
            except Exception as e:
                for item in pending_batch:
                    final_results.append({
                        "ok": True,
                        "name": item["name"],
                        "url": item["url"],
                        "warning": f"图片已上传但 Gist 最后同步失败: {str(e)}"
                    })

        if not final_results:
            return jsonify({"error": "没有处理任何文件"}), 400

        if len(images) == 1 and len(final_results) == 1:
            r = final_results[0]
            if r.get("ok"):
                return jsonify({"success": True, "name": r.get("name"), "url": r.get("url")}), 200
            else:
                return jsonify({"error": r.get("error")}), 400

        return jsonify({"success": True, "results": final_results}), 200

    except Exception as e:
        return jsonify({"error": "服务器内部错误", "details": str(e)}), 500

@app.route("/api/finalize_batch", methods=["POST"])
def api_finalize_batch():
    return jsonify({"success": True, "message": "Batch is now handled automatically in upload"}), 200

# ===================== AI 抠图相关 (保持不变) =====================

def call_clipdrop_remove_bg(image):
    api_key = os.getenv("CLIPDROP_API_KEY", "").strip()
    if not api_key:
        raise Exception("CLIPDROP_API_KEY 未配置")
    url = "https://clipdrop-api.co/remove-background/v1"
    headers = {"x-api-key": api_key}
    files = {"image_file": (image.filename, image.stream, image.mimetype)}
    r = requests.post(url, headers=headers, files=files, timeout=60)
    if r.status_code != 200:
        raise Exception(f"Clipdrop error: {r.status_code}")
    return r.content

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
        raise Exception(f"Removebg error: {r.status_code}")
    return r.content

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
        raise Exception(f"Custom AI error: {r.status_code}")
    return r.content

@app.route("/api/ai_cutout", methods=["POST"])
def api_ai_cutout_default():
    try:
        image = request.files.get("image")
        if not image:
            return jsonify({"error": "缺少图片"}), 400
        candidates = []
        if os.getenv("CLIPDROP_API_KEY", "").strip():
            candidates.append(call_clipdrop_remove_bg)
        if os.getenv("REMOVEBG_API_KEY", "").strip():
            candidates.append(call_removebg_remove_bg)
        if not candidates:
            return jsonify({"error": "默认AI未配置"}), 500
        random.shuffle(candidates)
        last_err = None
        for fn in candidates:
            try:
                return Response(fn(image), mimetype="image/png")
            except Exception as e:
                last_err = str(e)
                continue
        return jsonify({"error": "AI抠图全失败", "details": last_err}), 500
    except Exception as e:
        return jsonify({"error": "AI抠图失败", "details": str(e)}), 500

@app.route("/api/ai/custom/auth", methods=["POST"])
def api_custom_ai_auth():
    if not CUSTOM_AI_ENABLED:
        return jsonify({"error": "未启用"}), 403
    data = request.get_json(silent=True) or {}
    if (data.get("password") or "").strip() != CUSTOM_AI_PASSWORD:
        return jsonify({"error": "密码错误"}), 403
    resp = jsonify({"success": True})
    token = serializer.dumps({"ok": 1})
    resp.set_cookie("custom_ai_auth", token, max_age=86400, httponly=True, samesite="Lax", secure=True)
    return resp

def _check_custom_ai_cookie():
    raw = request.cookies.get("custom_ai_auth", "")
    try:
        serializer.loads(raw, max_age=86400)
        return True
    except:
        return False

@app.route("/api/ai_cutout_custom", methods=["POST"])
def api_ai_cutout_custom():
    try:
        if not CUSTOM_AI_ENABLED:
            return jsonify({"error": "未启用"}), 403
        if not _check_custom_ai_cookie():
            return jsonify({"error": "未解锁"}), 403
        image = request.files.get("image")
        if not image:
            return jsonify({"error": "缺少图片"}), 400
        return Response(call_custom_remove_bg(image), mimetype="image/png")
    except Exception as e:
        return jsonify({"error": "自定义AI失败", "details": str(e)}), 500

if __name__ == "__main__":
    app.run()
