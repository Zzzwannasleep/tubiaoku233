async function uploadSingle() {
  const nameInput = document.getElementById("name");
  const imageInput = document.getElementById("image");
  const messageDiv = document.getElementById("message");
  const resultList = document.getElementById("resultList");

  if (resultList) resultList.innerHTML = "";

  if (!nameInput.value || !imageInput.files[0]) {
    messageDiv.textContent = "请输入名称并选择图片！";
    return;
  }

  const formData = new FormData();
  formData.append("source", imageInput.files[0]); // 后端字段名是 source
  formData.append("name", nameInput.value.trim());

  messageDiv.textContent = "正在上传...";
  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      messageDiv.textContent = `上传成功！名称: ${data.name}`;
      if (resultList) resultList.innerHTML = `<li>✅ <b>${data.name}</b></li>`;
      nameInput.value = "";
      imageInput.value = "";
    } else {
      messageDiv.textContent = `错误：${data.error || `HTTP ${response.status}`}`;
    }
  } catch (error) {
    messageDiv.textContent = `上传失败：${error.message}`;
  }
}

async function uploadBatch() {
  const imageInput = document.getElementById("image");
  const messageDiv = document.getElementById("message");
  const resultList = document.getElementById("resultList");

  const files = Array.from(imageInput.files || []);
  if (resultList) resultList.innerHTML = "";

  if (files.length === 0) {
    messageDiv.textContent = "请选择图片（可多选）！";
    return;
  }

  function filenameToName(filename) {
    return filename.split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
  }

  function addResult(ok, name, info) {
    if (!resultList) return;
    const li = document.createElement("li");
    li.style.marginTop = "6px";
    li.innerHTML = ok
      ? `✅ <b>${name}</b> ${info ? `→ <a href="${info}" target="_blank">${info}</a>` : ""}`
      : `❌ <b>${name}</b> → ${info || "失败"}`;
    resultList.appendChild(li);
  }

  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const name = filenameToName(f.name);

      const formData = new FormData();
      formData.append("source", f);
      formData.append("name", name); // 批量时自动用文件名当 name

      messageDiv.textContent = `批量上传中 ${i + 1}/${files.length}: ${f.name}`;

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        addResult(true, data.name || name, data.url || "");
      } else {
        addResult(false, name, data.error || `HTTP ${response.status}`);
      }
    }

    messageDiv.textContent = `批量上传完成：${files.length}/${files.length}`;
    imageInput.value = "";
  } catch (err) {
    messageDiv.textContent = `批量上传失败：${err.message}`;
  }
}

  messageDiv.textContent = "开始上传...";
  try {
    // ✅ 串行逐个上传（最稳，不容易超时/被服务限制）
    for (let i = 0; i < files.length; i++) {
      const f = files[i];

      // 批量：默认用文件名；单张：用手填
      let name = manualName;
      if (files.length > 1) {
        name = useFilename.checked ? filenameToName(f.name) : (manualName || filenameToName(f.name));
      }

      const formData = new FormData();
      formData.append("source", f);   // 你的后端字段名是 source
      formData.append("name", name);  // 批量也会传一个 name（后端会做唯一化）

      messageDiv.textContent = `正在上传 ${i + 1}/${files.length}: ${f.name}`;

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.success) {
        // 你当前后端单张只回 name；如果你按我建议加了 url，则这里也能显示 url
        addResult(true, data.name || name, data.url || "");
      } else {
        addResult(false, name, data.error || `HTTP ${response.status}`);
      }
    }

    messageDiv.textContent = `上传完成：${files.length}/${files.length}`;
    nameInput.value = "";
    imageInput.value = "";
  } catch (error) {
    messageDiv.textContent = `上传失败：${error.message}`;
  }
}

/* ===== 随机背景（接口版）===== */
(function () {

  // 👇👇👇 把你的「随机图片 URL」填在这里
  const randomImageURL = "https://www.loliapi.com/acg/";

  document.body.style.backgroundImage = `
    url(${randomImageURL}),
    radial-gradient(900px 600px at 12% 18%, rgba(255,107,214,.25), transparent 60%),
    radial-gradient(800px 520px at 85% 20%, rgba(57,213,255,.20), transparent 55%),
    radial-gradient(900px 650px at 55% 92%, rgba(124,107,255,.18), transparent 60%),
    linear-gradient(135deg, #ffe9f6, #e9f1ff, #eafff7)
  `;

  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.backgroundRepeat = "no-repeat";
  document.body.style.backgroundAttachment = "fixed";

})();
