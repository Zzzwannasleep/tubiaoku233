async function uploadImage() {
  const nameInput = document.getElementById("name");
  const imageInput = document.getElementById("image");
  const messageDiv = document.getElementById("message");

  if (!nameInput.value || !imageInput.files[0]) {
    messageDiv.textContent = "请输入名称并选择图片！";
    return;
  }

  const formData = new FormData();
  formData.append("source", imageInput.files[0]);
  formData.append("name", nameInput.value);

  messageDiv.textContent = "正在上传...";
  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (response.ok) {
      messageDiv.textContent = `上传成功！名称: ${data.name}`;
      nameInput.value = "";
      imageInput.value = "";
    } else {
      messageDiv.textContent = `错误：${data.error}`;
    }
  } catch (error) {
    messageDiv.textContent = `上传失败：${error.message}`;
  }
}