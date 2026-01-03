let currentImageURL = null;

// Cropper
let cropper = null;

// Fabric
let fCanvas = null;
let fImgObj = null;
let historyStack = []; // 用于撤销（保存 dataURL）

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
    aspectRatio: 1,     // ✅ 固定 1:1
    dragMode: "move",
    autoCropArea: 1,
    background: false,
    movable: true,
    zoomable: true,
    scalable: false,
    rotatable: false,
  });
}

function initFabricWithImage(imgURL) {
  // 初始化 canvas 尺寸
  const canvasEl = el("cutoutCanvas");
  const wrap = el("cutoutWrap");

  // 以容器大小设定画布实际尺寸（重要：否则模糊/错位）
  const rect = wrap.getBoundingClientRect();
  const w = Math.max(300, Math.floor(rect.width));
  const h = Math.max(420, Math.floor(rect.height));

  canvasEl.width = w;
  canvasEl.height = h;

  // 新建 Fabric canvas
  fCanvas = new fabric.Canvas("cutoutCanvas", {
    preserveObjectStacking: true,
    selection: false,
  });

  // 加载图片
  fabric.Image.fromURL(imgURL, (img) => {
    fImgObj = img;

    // 适配缩放：让图片尽量铺满画布但不溢出
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

    // 开启橡皮擦（Fabric v5 支持 eraser）
    const eraser = new fabric.EraserBrush(fCanvas);
    eraser.width = Number(el("brushSize").value || 25);
    fCanvas.freeDrawingBrush = eraser;
    fCanvas.isDrawingMode = true;

    // 保存初始状态用于撤销
    historyStack = [fCanvas.toDataURL({ format: "png" })];

    // 每次完成一笔，存历史
    fCanvas.on("path:created", () => {
      historyStack.push(fCanvas.toDataURL({ format: "png" }));
      // 避免无限增长：最多保留 30 步
      if (historyStack.length > 30) historyStack.shift();
    });
  }, { crossOrigin: "anonymous" });
}

function loadFile(file) {
  clearExportPreview();

  if (currentImageURL) URL.revokeObjectURL(currentImageURL);
  currentImageURL = URL.createObjectURL(file);

  // 先进入裁剪模式默认
  showOnly("crop");

  const cropImg = el("cropImage");
  cropImg.onload = () => initCropper(cropImg);
  cropImg.src = currentImageURL;
}

// 从裁剪器导出方形 512 canvas
function getCropCanvas512() {
  if (!cropper) return null;
  return cropper.getCroppedCanvas({
    width: 512,
    height: 512,
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "high",
  });
}

// 让方形 canvas 变成圆形透明 PNG
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

async function exportSquareFromCurrentMode() {
  // 如果在抠图模式：直接从 fabric 导出
  if (fCanvas && el("cutoutWrap").style.display !== "none") {
    const dataURL = fCanvas.toDataURL({ format: "png" });
    const blob = await (await fetch(dataURL)).blob();
    setExportPreview(blob);
    return;
  }

  // 裁剪模式：从 cropper 导出 512
  const c = getCropCanvas512();
  if (!c) return alert("请先导入图片并进入裁剪模式");
  c.toBlob((blob) => setExportPreview(blob), "image/png");
}

async function exportCircleFromCurrentMode() {
  // 抠图模式：先把当前画布导出成方形 PNG，再做圆形 mask
  if (fCanvas && el("cutoutWrap").style.display !== "none") {
    const dataURL = fCanvas.toDataURL({ format: "png" });
    const imgBlob = await (await fetch(dataURL)).blob();
    const img = new Image();
    img.onload = async () => {
      const size = 512;
      const square = document.createElement("canvas");
      square.width = size;
      square.height = size;
      const ctx = square.getContext("2d");
      ctx.clearRect(0, 0, size, size);

      // 等比居中绘制
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);

      const circleBlob = await squareCanvasToCircleBlob(square);
      setExportPreview(circleBlob);
    };
    img.src = URL.createObjectURL(imgBlob);
    return;
  }

  // 裁剪模式：方形 512 → 圆形
  const c = getCropCanvas512();
  if (!c) return alert("请先导入图片并进入裁剪模式");
  const circleBlob = await squareCanvasToCircleBlob(c);
  setExportPreview(circleBlob);
}

function resetAll() {
  clearExportPreview();

  destroyCropper();
  const cropImg = el("cropImage");
  cropImg.src = "";

  if (fCanvas) {
    fCanvas.dispose();
    fCanvas = null;
    fImgObj = null;
    historyStack = [];
  }

  showOnly("empty");
}

function switchToCropMode() {
  clearExportPreview();
  showOnly("crop");

  // 进入裁剪模式：如果之前在抠图模式改过图，建议重新载入（简单做法）
  // 用户可以先“导出”后再上传，这里不做回写。
  if (el("cropImage").src) initCropper(el("cropImage"));
}

function switchToCutoutMode() {
  clearExportPreview();
  showOnly("cutout");
  destroyCropper();

  if (!currentImageURL) {
    showOnly("empty");
    return alert("请先导入图片");
  }

  // 每次切换到抠图模式，重新初始化 Fabric
  if (fCanvas) {
    fCanvas.dispose();
    fCanvas = null;
    fImgObj = null;
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

  // 弹出当前状态，回到上一步
  historyStack.pop();
  const prev = historyStack[historyStack.length - 1];

  fabric.Image.fromURL(prev, (img) => {
    // 用上一帧渲染覆盖
    fCanvas.clear();

    // 把整张 png 当成一张图铺满画布
    img.set({
      left: 0,
      top: 0,
      selectable: false,
      evented: false,
    });

    // 拉伸适配画布
    const cw = fCanvas.getWidth();
    const ch = fCanvas.getHeight();
    img.scaleToWidth(cw);
    img.scaleToHeight(ch);

    fCanvas.add(img);
    fCanvas.renderAll();

    // 重新启用橡皮擦
    const eraser = new fabric.EraserBrush(fCanvas);
    eraser.width = Number(el("brushSize").value || 25);
    fCanvas.freeDrawingBrush = eraser;
    fCanvas.isDrawingMode = true;
  }, { crossOrigin: "anonymous" });
}

// 绑定事件
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

  el("btnExportSquare").addEventListener("click", exportSquareFromCurrentMode);
  el("btnExportCircle").addEventListener("click", exportCircleFromCurrentMode);

  el("btnReset").addEventListener("click", resetAll);
});
