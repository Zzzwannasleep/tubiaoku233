let currentImageURL = null;
let originalFilenameBase = "icon";

// Cropper
let cropper = null;

// Fabric
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

function initCropper(imgEl) {
  destroyCropper();
  cropper = new Cropper(imgEl, {
    viewMode: 1,
    aspectRatio: 1,     // 固定 1:1
    dragMode: "move",
    autoCropArea: 1,
    background: false,
    movable: true,
    zoomable: true,
    scalable: false,
    rotatable: false,
  });
}

function filenameToName(filename) {
  return filename.split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
}

function initFabricWithImage(imgURL) {
  const canvasEl = el("cutoutCanvas");
  const wrap = el("cutoutWrap");

  const rect = wrap.getBoundingClientRect();
  const w = Math.max(300, Math.floor(rect.width));
  const h = Math.max(420, Math.floor(rect.height));

  canvasEl.width = w;
  canvasEl.height = h;

  fCanvas = new fabric.Canvas("cutoutCanvas", {
    preserveObjectStacking: true,
    selection: false,
  });

  fabric.Image.fromURL(imgURL, (img) => {
    const scale = Math.min(w / img.width, h / img.height);
    img.scale(scale);

    img.set({
      left: (w - img.getScaledWidth()) / 2,
      top: (h - img.getScaledHeight()) / 2,
      selectable: false,
      evented: false,
    });

    fCanvas.clear();
    fCanvas.add(img);
    fCanvas.renderAll();

    // 开启橡皮擦
    const eraser = new fabric.EraserBrush(fCanvas);
    eraser.width = Number(el("brushSize").value || 25);
    fCanvas.freeDrawingBrush = eraser;
    fCanvas.isDrawingMode = true;

    // 初始快照
    historyStack = [fCanvas.toDataURL({ format: "png" })];

    fCanvas.on("path:created", () => {
      historyStack.push(fCanvas.toDataURL({ format: "png" }));
      if (historyStack.length > 30) historyStack.shift();
    });
  }, { crossOrigin: "anonymous" });
}

function loadFile(file) {
  clearExportPreview();
  el("uploadMsg").textContent = "";

  originalFilenameBase = filenameToName(file.name) || "icon";

  if (currentImageURL) URL.revokeObjectURL(currentImageURL);
  currentImageURL = URL.createObjectURL(file);

  // 默认进裁剪模式
  showOnly("crop");

  const cropImg = el("cropImage");
  cropImg.onload = () => initCropper(cropImg);
  cropImg.src = currentImageURL;
}

/* ========== 生成导出 Blob（方形/圆形 512） ========== */

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

/* ========== 导出预览 ========== */

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

/* ========== 一键上传到图标库（核心） ========== */

function getUploadName() {
  const manual = (el("uploadName").value || "").trim();
  // 不填就用文件名；再不行就 icon
  return manual || originalFilenameBase || "icon";
}

async function uploadBlobToLibrary(blob, nameBase, suffix) {
  const uploadMsg = el("uploadMsg");
  uploadMsg.textContent = "正在上传到图标库...";

  // 组装一个 File，让后端拿到 filename/mimetype 都正常
  const filename = `${nameBase}${suffix}.png`;
  const file = new File([blob], filename, { type: "image/png" });

  const fd = new FormData();
  fd.append("source", file);       // ✅ 你的后端字段名是 source
  fd.append("name", nameBase);     // ✅ 你的后端用 name 写入 gist（并做唯一化）

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

/* ========== 模式切换 / 抠图工具 ========== */

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

  if (fCanvas) {
    fCanvas.dispose();
    fCanvas = null;
    historyStack = [];
  }
  initFabricWithImage(currentImageURL);
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

function resetAll() {
  clearExportPreview();
  el("uploadMsg").textContent = "";
  el("uploadName").value = "";

  destroyCropper();
  el("cropImage").src = "";

  if (fCanvas) {
    fCanvas.dispose();
    fCanvas = null;
    historyStack = [];
  }

  showOnly("empty");
}

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

  el("brushSize").addEventListener("input", updateBrushSizeUI);
  updateBrushSizeUI();

  el("btnUndo").addEventListener("click", undoOneStep);

  el("btnExportSquare").addEventListener("click", exportSquare);
  el("btnExportCircle").addEventListener("click", exportCircle);

  el("btnUploadSquare").addEventListener("click", uploadSquareToLibrary);
  el("btnUploadCircle").addEventListener("click", uploadCircleToLibrary);

  el("btnReset").addEventListener("click", resetAll);
});
