const form = document.getElementById("chatForm");
const input = document.getElementById("chatInput");
const messages = document.getElementById("chatMessages");
const sendButton = document.getElementById("chatSend");

const history = [];

function formatBotMessage(text) {
  if (!text) return "";

  const html = marked.parse(text, {
    breaks: true,
    gfm: true
  });

  return DOMPurify.sanitize(html);
}

function addMessage(text, type) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${type}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = type === "bot" ? "G" : "Você";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (type === "bot") {
    bubble.innerHTML = formatBotMessage(text);
  } else {
    bubble.textContent = text;
  }

  wrapper.append(avatar, bubble);
  messages.appendChild(wrapper);

  messages.scrollTop = messages.scrollHeight;

  return wrapper;
}

function addTyping() {
  const wrapper = addMessage("Genvity está pensando...", "bot");
  wrapper.querySelector(".bubble").classList.add("typing");

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

    const answer = data.answer || data.response;

    if (!answer) {
      throw new Error("O Gemini não retornou uma resposta.");
    }

    addMessage(answer, "bot");

    history.push({
      role: "assistant",
      content: answer
    });

  } catch (error) {
    console.error("Erro no chatbot:", error);

    typing.remove();

    addMessage(
      "Não consegui responder agora. Verifique se o servidor está funcionando e se a chave da API do Gemini está configurada.",
      "bot"
    );

  } finally {
    sendButton.disabled = false;
    input.focus();
  }
});