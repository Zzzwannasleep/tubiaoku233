let currentImageURL = null;
let originalFilenameBase = "icon";

/* Cropper */
let cropper = null;

/* Fabric */
let fCanvas = null;
let historyStack = []; // 撤销栈：存 dataURL（最多 30）

const el = (id) => document.getElementById(id);

function showOnly(which) {
  el("emptyWrap").style.display = which === "empty" ? "flex" : "none";
  el("cropWrap").style.display = which === "crop" ? "flex" : "none";
  el("cutoutWrap").style.display = which === "cutout" ? "flex" : "none";
}

function setExportPreview(blob) {
  const url = URL.createObjectURL(blob);
  el("exportImg").src = url;
  el("exportWrap").style.display = "block";
}

function clearExportPreview() {
  el("exportWrap").style.display = "none";
  el("exportImg").src = "";
}

function destroyCropper() {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}

function filenameToName(filename) {
  return filename.split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
}

/* ========== ✅ 裁剪：更像 PS（框哪裁哪） ========== */

function initCropper(imgEl) {
  destroyCropper();

  cropper = new Cropper(imgEl, {
    aspectRatio: 1,        // ✅ 固定 1:1
    viewMode: 1,
    autoCrop: true,
    autoCropArea: 0.65,    // ✅ 默认不要铺满，给你手动框选感觉

    cropBoxMovable: true,
    cropBoxResizable: true,

    // ✅ 更像“框选裁剪”：主要移动裁剪框，缩放图片对齐
    dragMode: "none",

    guides: true,
    center: true,
    highlight: true,
    background: false,

    zoomOnWheel: true,
    zoomable: true,

    rotatable: false,
    scalable: false,
    movable: true,
  });
}

/* 裁剪工具按钮 */
function cropBoxCenter() {
  if (!cropper) return;

  const data = cropper.getData(true);
  const imageData = cropper.getImageData();

  // 让裁剪框居中（保持大小）
  const newX = (imageData.naturalWidth - data.width) / 2;
  const newY = (imageData.naturalHeight - data.height) / 2;

  cropper.setData({ x: newX, y: newY, width: data.width, height: data.height });
}

function cropBoxMax() {
  if (!cropper) return;

  // 把裁剪框尽量放大到可视区域（仍保持 1:1）
  // 这里用 autoCropArea 重置一次最稳
  cropper.setAspectRatio(1);
  cropper.crop();
  cropper.setCropBoxData({ left: 0, top: 0 }); // 先一个触发
  cropper.zoomTo(1); // 先回到 1
  cropper.reset();
  // reset 会回默认 crop box，这里再强制更大一点
  cropper.setCropBoxData({ width: 360, height: 360 });
}

function zoomIn() {
  if (!cropper) return;
  cropper.zoom(0.08);
}

function zoomOut() {
  if (!cropper) return;
  cropper.zoom(-0.08);
}

function viewReset() {
  if (!cropper) return;
  cropper.reset();
}

/* ========== 抠图（Fabric 橡皮擦） ========== */

function initFabricWithImage(imgURL) {
  const canvasEl = el("cutoutCanvas");
  const wrap = el("cutoutWrap");

  const rect = wrap.getBoundingClientRect();
  const w = Math.max(320, Math.floor(rect.width || wrap.clientWidth || 320));
  const h = Math.max(420, Math.floor(rect.height || wrap.clientHeight || 420));

  canvasEl.width = w;
  canvasEl.height = h;

  if (fCanvas) {
    try { fCanvas.dispose(); } catch (e) {}
    fCanvas = null;
    historyStack = [];
  }

  const c = new fabric.Canvas("cutoutCanvas", {
    preserveObjectStacking: true,
    selection: false
  });
  fCanvas = c;

  c.isDrawingMode = true;

  fabric.Image.fromURL(
    imgURL,
    (img) => {
      const scale = Math.min(w / img.width, h / img.height);
      img.scale(scale);

      img.set({
        left: (w - img.getScaledWidth()) / 2,
        top: (h - img.getScaledHeight()) / 2,
        selectable: false,
        evented: false
      });

      c.clear();
      c.add(img);
      c.renderAll();

      if (!fabric.EraserBrush) {
        alert("当前 Fabric 版本不支持 EraserBrush（需要 Fabric v5+）。请检查是否加载了 fabric@5.x");
        return;
      }

      const eraser = new fabric.EraserBrush(c);
      eraser.width = Number(el("brushSize").value || 25);
      c.freeDrawingBrush = eraser;

      c.forEachObject((obj) => { obj.erasable = true; });

      historyStack = [c.toDataURL({ format: "png" })];

      c.off("path:created");
      c.on("path:created", () => {
        historyStack.push(c.toDataURL({ format: "png" }));
        if (historyStack.length > 30) historyStack.shift();
      });
    },
    { crossOrigin: "anonymous" }
  );
}

function updateBrushSizeUI() {
  const v = Number(el("brushSize").value || 25);
  el("brushSizeText").textContent = String(v);
  if (fCanvas && fCanvas.freeDrawingBrush) {
    fCanvas.freeDrawingBrush.width = v;
  }
}

function undoOneStep() {
  if (!fCanvas || historyStack.length <= 1) return;

  historyStack.pop();
  const prev = historyStack[historyStack.length - 1];

  fabric.Image.fromURL(prev, (img) => {
    fCanvas.clear();

    img.set({ left: 0, top: 0, selectable: false, evented: false });

    const cw = fCanvas.getWidth();
    const ch = fCanvas.getHeight();

    img.scaleToWidth(cw);
    img.scaleToHeight(ch);

    fCanvas.add(img);
    fCanvas.renderAll();

    const eraser = new fabric.EraserBrush(fCanvas);
    eraser.width = Number(el("brushSize").value || 25);
    fCanvas.freeDrawingBrush = eraser;
    fCanvas.isDrawingMode = true;
  }, { crossOrigin: "anonymous" });
}

/* ========== 导入图片 ========== */

function loadFile(file) {
  clearExportPreview();
  el("uploadMsg").textContent = "";

  originalFilenameBase = filenameToName(file.name) || "icon";

  if (currentImageURL) URL.revokeObjectURL(currentImageURL);
  currentImageURL = URL.createObjectURL(file);

  showOnly("crop");

  const cropImg = el("cropImage");
  cropImg.onload = () => initCropper(cropImg);
  cropImg.src = currentImageURL;
}

/* ========== 导出（方形/圆形 512） ========== */

function getCropCanvas512() {
  if (!cropper) return null;
  return cropper.getCroppedCanvas({
    width: 512,
    height: 512,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  });
}

function dataURLToBlob(dataURL) {
  return fetch(dataURL).then(r => r.blob());
}

function squareCanvasToCircleBlob(squareCanvas) {
  return new Promise((resolve) => {
    const size = squareCanvas.width;
    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;

    const ctx = out.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(squareCanvas, 0, 0);
    ctx.restore();

    out.toBlob((blob) => resolve(blob), "image/png");
  });
}

async function getSquareBlobFromCurrentMode() {
  // 抠图模式：从 Fabric 导出 png，再缩放到 512 方形
  if (fCanvas && el("cutoutWrap").style.display !== "none") {
    const dataURL = fCanvas.toDataURL({ format: "png" });
    const imgBlob = await dataURLToBlob(dataURL);

    const img = new Image();
    const url = URL.createObjectURL(imgBlob);

    return await new Promise((resolve) => {
      img.onload = () => {
        const size = 512;
        const square = document.createElement("canvas");
        square.width = size;
        square.height = size;
        const ctx = square.getContext("2d");
        ctx.clearRect(0, 0, size, size);

        const scale = Math.min(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

        square.toBlob((b) => resolve(b), "image/png");
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }

  // 裁剪模式
  const c = getCropCanvas512();
  if (!c) return null;
  return await new Promise((resolve) => c.toBlob((b) => resolve(b), "image/png"));
}

async function getCircleBlobFromCurrentMode() {
  const squareBlob = await getSquareBlobFromCurrentMode();
  if (!squareBlob) return null;

  const img = new Image();
  const url = URL.createObjectURL(squareBlob);

  return await new Promise((resolve) => {
    img.onload = async () => {
      const size = 512;
      const square = document.createElement("canvas");
      square.width = size;
      square.height = size;
      const ctx = square.getContext("2d");
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);

      const circleBlob = await squareCanvasToCircleBlob(square);
      URL.revokeObjectURL(url);
      resolve(circleBlob);
    };
    img.src = url;
  });
}

async function exportSquare() {
  const b = await getSquareBlobFromCurrentMode();
  if (!b) return alert("请先导入图片，并进行裁剪/抠图后再导出");
  setExportPreview(b);
}

async function exportCircle() {
  const b = await getCircleBlobFromCurrentMode();
  if (!b) return alert("请先导入图片，并进行裁剪/抠图后再导出");
  setExportPreview(b);
}

/* ========== 一键上传到图标库 ========== */

function getUploadName() {
  const manual = (el("uploadName").value || "").trim();
  return manual || originalFilenameBase || "icon";
}

async function uploadBlobToLibrary(blob, nameBase, suffix) {
  const uploadMsg = el("uploadMsg");
  uploadMsg.textContent = "正在上传到图标库...";

  const filename = `${nameBase}${suffix}.png`;
  const file = new File([blob], filename, { type: "image/png" });

  const fd = new FormData();
  fd.append("source", file);     // 后端字段名：source
  fd.append("name", nameBase);   // 写入 gist 的 name（后端做唯一化）

  try {
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      uploadMsg.innerHTML = `✅ 上传成功！最终名称：<b>${data.name}</b>`;
    } else {
      uploadMsg.textContent = `❌ 上传失败：${data.error || `HTTP ${res.status}`}`;
    }
  } catch (e) {
    uploadMsg.textContent = `❌ 上传失败：${e.message}`;
  }
}

async function uploadSquareToLibrary() {
  const b = await getSquareBlobFromCurrentMode();
  if (!b) return alert("请先导入图片，并进行裁剪/抠图后再上传");
  const name = getUploadName();
  await uploadBlobToLibrary(b, name, "");
}

async function uploadCircleToLibrary() {
  const b = await getCircleBlobFromCurrentMode();
  if (!b) return alert("请先导入图片，并进行裁剪/抠图后再上传");
  const name = getUploadName();
  await uploadBlobToLibrary(b, name, "_circle");
}

/* ========== 模式切换 ========== */

function switchToCropMode() {
  clearExportPreview();
  el("uploadMsg").textContent = "";
  showOnly("crop");

  if (el("cropImage").src) initCropper(el("cropImage"));
}

function switchToCutoutMode() {
  clearExportPreview();
  el("uploadMsg").textContent = "";
  showOnly("cutout");
  destroyCropper();

  if (!currentImageURL) {
    showOnly("empty");
    return alert("请先导入图片");
  }

  initFabricWithImage(currentImageURL);
}

function resetAll() {
  clearExportPreview();
  el("uploadMsg").textContent = "";
  el("uploadName").value = "";

  destroyCropper();
  el("cropImage").src = "";

  if (fCanvas) {
    try { fCanvas.dispose(); } catch (e) {}
    fCanvas = null;
    historyStack = [];
  }

  showOnly("empty");
}

/* ========== ✅ 编辑页随机背景 + 点击切换下一张 ========== */
(function () {
  const randomImageURL = "https://www.loliapi.com/acg/";
  const body = document.body;

  if (!body.classList.contains("editor-body")) return;

  function withCacheBuster(url) {
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}t=${Date.now()}`;
  }

  function applyRandomBg() {
    const bgUrl = withCacheBuster(randomImageURL);
    body.style.backgroundImage = `
      url(${bgUrl}),
      radial-gradient(900px 600px at 12% 18%, rgba(255,107,214,.25), transparent 60%),
      radial-gradient(800px 520px at 85% 20%, rgba(57,213,255,.20), transparent 55%),
      radial-gradient(900px 650px at 55% 92%, rgba(124,107,255,.18), transparent 60%),
      linear-gradient(135deg, #ffe9f6, #e9f1ff, #eafff7)
    `;
    body.style.backgroundSize = "cover";
    body.style.backgroundPosition = "center";
    body.style.backgroundRepeat = "no-repeat";
    body.style.backgroundAttachment = "fixed";
  }

  applyRandomBg();

  // 点击空白背景切换：只要不是点在界面内就切换
  document.addEventListener("click", (e) => {
    const inTopbar = e.target.closest(".editor-topbar");
    const inLayout = e.target.closest(".editor-layout");
    const inPanel = e.target.closest(".editor-panel");
    const inStage = e.target.closest(".editor-stage");
    if (inTopbar || inLayout || inPanel || inStage) return;
    applyRandomBg();
  }, { passive: true });

  // Shift + 点击任意位置也切换（保底）
  document.addEventListener("click", (e) => {
    if (!e.shiftKey) return;
    applyRandomBg();
  }, { passive: true });
})();

/* ========== 事件绑定 ========== */

window.addEventListener("DOMContentLoaded", () => {
  showOnly("empty");

  el("fileInput").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadFile(file);
  });

  el("btnModeCrop").addEventListener("click", switchToCropMode);
  el("btnModeCutout").addEventListener("click", switchToCutoutMode);

  // 裁剪工具
  el("btnCropCenter").addEventListener("click", cropBoxCenter);
  el("btnCropMax").addEventListener("click", cropBoxMax);
  el("btnZoomIn").addEventListener("click", zoomIn);
  el("btnZoomOut").addEventListener("click", zoomOut);
  el("btnViewReset").addEventListener("click", viewReset);

  // 抠图工具
  el("brushSize").addEventListener("input", updateBrushSizeUI);
  updateBrushSizeUI();
  el("btnUndo").addEventListener("click", undoOneStep);

  // 导出
  el("btnExportSquare").addEventListener("click", exportSquare);
  el("btnExportCircle").addEventListener("click", exportCircle);

  // 上传
  el("btnUploadSquare").addEventListener("click", uploadSquareToLibrary);
  el("btnUploadCircle").addEventListener("click", uploadCircleToLibrary);

  el("btnReset").addEventListener("click", resetAll);
});
