
const links = document.querySelectorAll('.nav a');
links.forEach(link => {
  link.addEventListener('click', () => {
    links.forEach(item => item.classList.remove('active'));
    link.classList.add('active');
  });
});

// Scanner demo: opens the device camera when supported.
const scannerButton = document.querySelector('.scanner-button');
if (scannerButton) {
  scannerButton.addEventListener('click', async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Seu navegador não oferece acesso à câmera.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:true});
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = stream;
      video.style.cssText = `
        position:fixed; inset:8%; width:84%; height:84%;
        object-fit:cover; border-radius:24px; z-index:1000;
        background:#000; box-shadow:0 20px 50px rgba(0,0,0,.45);
      `;
      document.body.appendChild(video);

      const close = document.createElement('button');
      close.textContent = 'Fechar câmera';
      close.style.cssText = `
        position:fixed; bottom:6%; left:50%; transform:translateX(-50%);
        z-index:1001; border:0; border-radius:14px; padding:13px 20px;
        background:#8f49b8; color:white; font-weight:700; cursor:pointer;
      `;
      document.body.appendChild(close);

      close.onclick = () => {
        stream.getTracks().forEach(track => track.stop());
        video.remove();
        close.remove();
      };
    } catch {
      alert('Não foi possível acessar a câmera. Verifique a permissão do navegador.');
    }
  });
}
