let currentImageURL = null;
let originalFilenameBase = "icon";

/* Cropper */
let cropper = null;

/* Cutout (native canvas) */
let cutCanvas = null;
let cutCtx = null;
let cutImg = null;

let cutIsDrawing = false;
let cutBrushSize = 25;
let cutBrushOpacity = 1.0;     // 0~1
let cutBrushSoftness = 0.35;   // 0~1
let cutMode = "erase";         // "erase" | "restore"
let cutHistory = [];           // dataURL stack (max 30)

// 图片绘制在 canvas 的映射信息（用于恢复画笔精确从原图取像素）
let drawMap = {
  dx: 0, dy: 0, dw: 0, dh: 0,
  scale: 1,
  iw: 0, ih: 0
};

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

function filenameToName(filename) {
  return filename.split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
}

/* ========== Cropper ========== */

function destroyCropper() {
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
}

function initCropper(imgEl) {
  destroyCropper();

  cropper = new Cropper(imgEl, {
    aspectRatio: 1,
    viewMode: 1,
    autoCrop: true,
    autoCropArea: 0.65,

    cropBoxMovable: true,
    cropBoxResizable: true,

    dragMode: "none",  // 更像“框选裁剪”
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

function cropBoxCenter() {
  if (!cropper) return;
  const data = cropper.getData(true);
  const imageData = cropper.getImageData();
  const newX = (imageData.naturalWidth - data.width) / 2;
  const newY = (imageData.naturalHeight - data.height) / 2;
  cropper.setData({ x: newX, y: newY, width: data.width, height: data.height });
}

function cropBoxMax() {
  if (!cropper) return;
  cropper.reset();
  cropper.setAspectRatio(1);
  cropper.setCropBoxData({ width: 420, height: 420 });
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

/* ========== Cutout (erase / restore) ========== */

function initCutoutCanvas(imgURL) {
  cutCanvas = el("cutoutCanvas");
  const wrap = el("cutoutWrap");

  const rect = wrap.getBoundingClientRect();
  const w = Math.max(320, Math.floor(rect.width || wrap.clientWidth || 320));
  const h = Math.max(420, Math.floor(rect.height || wrap.clientHeight || 420));

  cutCanvas.width = w;
  cutCanvas.height = h;

  cutCtx = cutCanvas.getContext("2d", { willReadFrequently: true });
  cutCtx.clearRect(0, 0, w, h);

  cutImg = new Image();
  cutImg.crossOrigin = "anonymous";

  cutImg.onload = () => {
    // 画到画布中心（contain）
    const scale = Math.min(w / cutImg.width, h / cutImg.height);
    const dw = cutImg.width * scale;
    const dh = cutImg.height * scale;
    const dx = (w - dw) / 2;
    const dy = (h - dh) / 2;

    drawMap = {
      dx, dy, dw, dh,
      scale,
      iw: cutImg.width,
      ih: cutImg.height
    };

    cutCtx.clearRect(0, 0, w, h);
    cutCtx.globalCompositeOperation = "source-over";
    cutCtx.globalAlpha = 1;
    cutCtx.drawImage(cutImg, dx, dy, dw, dh);

    cutHistory = [cutCanvas.toDataURL("image/png")];
  };

  cutImg.src = imgURL;

  bindCutoutEvents();
}

function setMode(mode) {
  cutMode = mode === "restore" ? "restore" : "erase";

  // 按钮视觉：简单做个“按下态”
  const eraseBtn = el("btnBrushErase");
  const restoreBtn = el("btnBrushRestore");
  if (eraseBtn && restoreBtn) {
    if (cutMode === "erase") {
      eraseBtn.style.filter = "brightness(1.08)";
      restoreBtn.style.filter = "";
    } else {
      restoreBtn.style.filter = "brightness(1.08)";
      eraseBtn.style.filter = "";
    }
  }
}

function updateBrushUI() {
  // size
  const s = Number(el("brushSize")?.value || 25);
  cutBrushSize = s;
  if (el("brushSizeText")) el("brushSizeText").textContent = String(s);

  // opacity
  const o = Number(el("brushOpacity")?.value || 100);
  cutBrushOpacity = Math.min(1, Math.max(0.1, o / 100));
  if (el("brushOpacityText")) el("brushOpacityText").textContent = String(o);

  // softness
  const soft = Number(el("brushSoftness")?.value || 35);
  cutBrushSoftness = Math.min(0.8, Math.max(0, soft / 100));
  if (el("brushSoftnessText")) el("brushSoftnessText").textContent = String(soft);
}

function bindCutoutEvents() {
  if (!cutCanvas) return;

  cutCanvas.onpointerdown = null;
  cutCanvas.onpointermove = null;
  window.onpointerup = null;

  cutCanvas.onpointerdown = (e) => {
    if (!cutCtx) return;
    cutIsDrawing = true;
    cutCanvas.setPointerCapture?.(e.pointerId);
    drawAtEvent(e, getEffectiveMode(e));
  };

  cutCanvas.onpointermove = (e) => {
    if (!cutIsDrawing) return;
    drawAtEvent(e, getEffectiveMode(e));
  };

  window.onpointerup = () => {
    if (!cutIsDrawing) return;
    cutIsDrawing = false;

    if (cutCanvas) {
      cutHistory.push(cutCanvas.toDataURL("image/png"));
      if (cutHistory.length > 30) cutHistory.shift();
    }
  };
}

// 按住 Alt 临时恢复画笔
function getEffectiveMode(e) {
  if (e && e.altKey) return "restore";
  return cutMode;
}

function getCanvasXY(e) {
  const rect = cutCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (cutCanvas.width / rect.width);
  const y = (e.clientY - rect.top) * (cutCanvas.height / rect.height);
  return { x, y };
}

function makeSoftCircleMask(ctx, r) {
  // 软边：中心 alpha=1，边缘 alpha=0
  const inner = Math.max(0, r * (1 - cutBrushSoftness));
  const g = ctx.createRadialGradient(0, 0, inner, 0, 0, r);
  g.addColorStop(0, `rgba(0,0,0,${cutBrushOpacity})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  return g;
}

function drawAtEvent(e, mode) {
  if (!cutCtx || !cutCanvas) return;
  if (!cutImg) return;

  const { x, y } = getCanvasXY(e);
  const r = Math.max(2, cutBrushSize / 2);

  // 只在图片区域附近操作（可选：你也可以去掉）
  // if (x < drawMap.dx || x > drawMap.dx + drawMap.dw || y < drawMap.dy || y > drawMap.dy + drawMap.dh) return;

  if (mode === "erase") {
    // ✅ 擦除（destination-out）
    cutCtx.save();
    cutCtx.globalCompositeOperation = "destination-out";

    // 用软边蒙版
    cutCtx.translate(x, y);
    cutCtx.fillStyle = makeSoftCircleMask(cutCtx, r);
    cutCtx.beginPath();
    cutCtx.arc(0, 0, r, 0, Math.PI * 2);
    cutCtx.fill();

    cutCtx.restore();
  } else {
    // ✅ 恢复：从原图把该区域“画回来”
    restoreFromOriginal(x, y, r);
  }
}

function restoreFromOriginal(cx, cy, r) {
  if (!cutCtx || !cutCanvas || !cutImg) return;

  // 如果点在图片外，直接不恢复
  const inside =
    cx >= drawMap.dx && cx <= drawMap.dx + drawMap.dw &&
    cy >= drawMap.dy && cy <= drawMap.dy + drawMap.dh;
  if (!inside) return;

  // 计算该点对应原图像素坐标
  const scale = drawMap.scale || 1;
  const ox = (cx - drawMap.dx) / scale; // original x
  const oy = (cy - drawMap.dy) / scale;

  // 在原图中取一个正方形区域（对应画笔）
  const or = r / scale; // 原图半径
  const sw = Math.ceil(or * 2);
  const sh = Math.ceil(or * 2);

  const sx = Math.floor(ox - or);
  const sy = Math.floor(oy - or);

  // ✅ 用临时 canvas：画原图小块 + 用软边圆形蒙版裁出来
  const temp = document.createElement("canvas");
  temp.width = sw;
  temp.height = sh;
  const tctx = temp.getContext("2d");

  // 画原图块（注意边界）
  tctx.clearRect(0, 0, sw, sh);
  tctx.globalCompositeOperation = "source-over";
  tctx.globalAlpha = 1;

  // drawImage 会自动处理超出区域（空白）
  tctx.drawImage(cutImg, sx, sy, sw, sh, 0, 0, sw, sh);

  // 叠蒙版（destination-in）
  tctx.globalCompositeOperation = "destination-in";
  tctx.translate(sw / 2, sh / 2);

  const rr = sw / 2;
  const inner = Math.max(0, rr * (1 - cutBrushSoftness));
  const g = tctx.createRadialGradient(0, 0, inner, 0, 0, rr);
  g.addColorStop(0, `rgba(0,0,0,${cutBrushOpacity})`);
  g.addColorStop(1, "rgba(0,0,0,0)");

  tctx.fillStyle = g;
  tctx.beginPath();
  tctx.arc(0, 0, rr, 0, Math.PI * 2);
  tctx.fill();

  // 把临时结果贴回主画布对应位置
  cutCtx.save();
  cutCtx.globalCompositeOperation = "source-over";
  cutCtx.globalAlpha = 1;
  cutCtx.drawImage(temp, cx - r, cy - r, r * 2, r * 2);
  cutCtx.restore();
}

function undoOneStep() {
  if (!cutCanvas || cutHistory.length <= 1) return;
  cutHistory.pop();
  const prev = cutHistory[cutHistory.length - 1];

  const img = new Image();
  img.onload = () => {
    cutCtx.clearRect(0, 0, cutCanvas.width, cutCanvas.height);
    cutCtx.globalCompositeOperation = "source-over";
    cutCtx.globalAlpha = 1;
    cutCtx.drawImage(img, 0, 0);
  };
  img.src = prev;
}

/* ========== Load file ========== */

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

/* ========== Export ========== */

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
  // 抠图模式：从 cutoutCanvas 导出，再缩放进 512x512
  if (cutCanvas && el("cutoutWrap").style.display !== "none") {
    const dataURL = cutCanvas.toDataURL("image/png");
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

/* ========== Upload ========== */

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
  fd.append("source", file);
  fd.append("name", nameBase);

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

/* ========== Mode switch ========== */

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

  initCutoutCanvas(currentImageURL);
}

function resetAll() {
  clearExportPreview();
  el("uploadMsg").textContent = "";
  el("uploadName").value = "";

  destroyCropper();
  el("cropImage").src = "";

  cutCanvas = null;
  cutCtx = null;
  cutImg = null;
  cutIsDrawing = false;
  cutHistory = [];
  drawMap = { dx:0, dy:0, dw:0, dh:0, scale:1, iw:0, ih:0 };

  showOnly("empty");
}

/* ========== Background switch ========== */
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

  document.addEventListener("click", (e) => {
    const inTopbar = e.target.closest(".editor-topbar");
    const inLayout = e.target.closest(".editor-layout");
    const inPanel = e.target.closest(".editor-panel");
    const inStage = e.target.closest(".editor-stage");
    if (inTopbar || inLayout || inPanel || inStage) return;
    applyRandomBg();
  }, { passive: true });

  document.addEventListener("click", (e) => {
    if (!e.shiftKey) return;
    applyRandomBg();
  }, { passive: true });
})();

/* ========== Bind events ========== */

window.addEventListener("DOMContentLoaded", () => {
  showOnly("empty");

  // 防止某些页面没有这些控件导致报错：都做存在性判断
  const fileInput = el("fileInput");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      loadFile(file);
    });
  }

  el("btnModeCrop")?.addEventListener("click", switchToCropMode);
  el("btnModeCutout")?.addEventListener("click", switchToCutoutMode);

  // crop tools
  el("btnCropCenter")?.addEventListener("click", cropBoxCenter);
  el("btnCropMax")?.addEventListener("click", cropBoxMax);
  el("btnZoomIn")?.addEventListener("click", zoomIn);
  el("btnZoomOut")?.addEventListener("click", zoomOut);
  el("btnViewReset")?.addEventListener("click", viewReset);

  // cutout tools
  el("btnBrushErase")?.addEventListener("click", () => setMode("erase"));
  el("btnBrushRestore")?.addEventListener("click", () => setMode("restore"));

  el("brushSize")?.addEventListener("input", updateBrushUI);
  el("brushOpacity")?.addEventListener("input", updateBrushUI);
  el("brushSoftness")?.addEventListener("input", updateBrushUI);
  updateBrushUI();

  el("btnUndo")?.addEventListener("click", undoOneStep);

  // export
  el("btnExportSquare")?.addEventListener("click", exportSquare);
  el("btnExportCircle")?.addEventListener("click", exportCircle);

  // upload
  el("btnUploadSquare")?.addEventListener("click", uploadSquareToLibrary);
  el("btnUploadCircle")?.addEventListener("click", uploadCircleToLibrary);

  el("btnReset")?.addEventListener("click", resetAll);

  // 默认模式：橡皮擦
  setMode("erase");
});
