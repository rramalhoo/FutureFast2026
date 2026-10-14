
const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const status = document.getElementById("status");
const cameraModal = document.getElementById("cameraModal");
const video = document.getElementById("cameraVideo");
const cameraBtn = document.getElementById("cameraBtn");
const closeCamera = document.getElementById("closeCamera");
const captureBtn = document.getElementById("captureBtn");

let stream = null;

function setStatus(text, active = false) {
  status.innerHTML = `<span class="status-dot ${active ? "active" : ""}"></span>${text}`;
}

function showImage(src) {
  preview.classList.add("has-image");
  preview.style.backgroundImage = `url("${src}")`;
  preview.innerHTML = `
    <div class="image-overlay">
      <span>✓</span>
      <strong>Receita carregada</strong>
      <small>Imagem pronta para leitura</small>
    </div>
    <div class="scan-corners"></div>
  `;
  setStatus("Receita pronta para análise", true);
}

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => showImage(e.target.result);
  reader.readAsDataURL(file);
});

cameraBtn.addEventListener("click", async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    video.srcObject = stream;
    cameraModal.classList.add("open");
  } catch (error) {
    setStatus("Não foi possível acessar a câmera");
  }
});

captureBtn.addEventListener("click", () => {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  showImage(canvas.toDataURL("image/jpeg", 0.9));
  stopCamera();
  cameraModal.classList.remove("open");
});

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
}

closeCamera.addEventListener("click", () => {
  stopCamera();
  cameraModal.classList.remove("open");
});

cameraModal.addEventListener("click", e => {
  if (e.target === cameraModal) {
    stopCamera();
    cameraModal.classList.remove("open");
  }
});
