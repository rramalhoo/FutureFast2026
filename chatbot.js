
const form = document.getElementById("chatForm");
const input = document.getElementById("chatInput");
const messages = document.getElementById("chatMessages");
const sendButton = document.getElementById("sendButton");

const history = [];

function addMessage(text, type) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${type}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = type === "bot" ? "G" : "Você";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

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
  if (!question || sendButton.disabled) return;

  addMessage(question, "user");
  history.push({ role: "user", content: question });
  input.value = "";
  sendButton.disabled = true;

  const typing = addTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: question,
        history: history.slice(-12)
      })
    });

    const data = await response.json();
    typing.remove();

    if (!response.ok) {
      throw new Error(data.error || "Não foi possível obter uma resposta.");
    }

    addMessage(data.answer, "bot");
    history.push({ role: "assistant", content: data.answer });
  } catch (error) {
    typing.remove();
    addMessage(
      "Não consegui responder agora. Verifique se o servidor está ligado e se a OPENAI_API_KEY foi configurada.",
      "bot"
    );
    console.error(error);
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
});
