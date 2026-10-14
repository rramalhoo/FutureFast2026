const form = document.getElementById("chatForm");
const input = document.getElementById("chatInput");
const messages = document.getElementById("chatMessages");
const sendButton = document.getElementById("chatSend");

const history = [];

function addMessage(text, type) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${type}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";

  if (type === "bot") {
    avatar.textContent = "G";
  } else {
    avatar.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.2"></circle>
        <path d="M5.5 20c.7-3.2 3-5 6.5-5s5.8 1.8 6.5 5"></path>
      </svg>
    `;
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (type === "bot") {
    const safeHtml = DOMPurify.sanitize(
      marked.parse(text, {
        breaks: true,
        gfm: true
      })
    );

    bubble.innerHTML = safeHtml;
  } else {
    bubble.textContent = text;
  }

  wrapper.append(avatar, bubble);
  messages.appendChild(wrapper);

  messages.scrollTop = messages.scrollHeight;

  return wrapper;
}

function addTyping() {
  const wrapper = document.createElement("div");
  wrapper.className = "message bot";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "G";

  const bubble = document.createElement("div");
  bubble.className = "bubble typing";

  bubble.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  wrapper.append(avatar, bubble);
  messages.appendChild(wrapper);

  messages.scrollTop = messages.scrollHeight;

  return wrapper;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = input.value.trim();

  if (!question || sendButton.disabled) {
    return;
  }

  addMessage(question, "user");

  history.push({
    role: "user",
    content: question
  });

  input.value = "";
  sendButton.disabled = true;

  const typing = addTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: question,
        history: history.slice(-12)
      })
    });

    const data = await response.json();

    typing.remove();

    if (!response.ok) {
      throw new Error(
        data.error || "Não foi possível obter uma resposta."
      );
    }

    addMessage(data.answer, "bot");

    history.push({
      role: "assistant",
      content: data.answer
    });
  } catch (error) {
    typing.remove();

    addMessage(
      "Não consegui responder agora. Verifique se o servidor está funcionando corretamente.",
      "bot"
    );

    console.error(error);
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});