
const STORAGE = "genvityMeds";
const TAKEN = "genvityTaken";
let meds = JSON.parse(localStorage.getItem(STORAGE) || "[]");
let taken = JSON.parse(localStorage.getItem(TAKEN) || "{}");
let viewDate = new Date();
let selectedDate = new Date();

const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const selectedDateTitle = document.getElementById("selectedDateTitle");
const medicationList = document.getElementById("medicationList");
const medCount = document.getElementById("medCount");
const summaryNumber = document.getElementById("summaryNumber");
const summaryText = document.getElementById("summaryText");
const agendaProgress = document.getElementById("agendaProgress");
const modal = document.getElementById("medModal");

const pad = n => String(n).padStart(2, "0");
const key = date => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;

function save() {
  localStorage.setItem(STORAGE, JSON.stringify(meds));
  localStorage.setItem(TAKEN, JSON.stringify(taken));
}

function formatLong(date) {
  return date.toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long" });
}

function renderCalendar() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  monthTitle.textContent = viewDate.toLocaleDateString("pt-BR", {month:"long", year:"numeric"});
  calendar.innerHTML = "";

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const offset = first.getDay();

  for (let i=0; i<offset; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    calendar.appendChild(empty);
  }

  for (let day=1; day<=last.getDate(); day++) {
    const date = new Date(year, month, day);
    const cell = document.createElement("button");
    cell.className = "calendar-day";
    if (key(date) === key(new Date())) cell.classList.add("today");
    if (key(date) === key(selectedDate)) cell.classList.add("selected");

    const count = meds.filter(m => m.date === key(date)).length;
    cell.innerHTML = `<span>${day}</span>${count ? `<i>${count}</i>` : ""}`;
    cell.onclick = () => {
      selectedDate = date;
      renderCalendar();
      renderDay();
    };
    calendar.appendChild(cell);
  }
}

function renderDay() {
  const selectedKey = key(selectedDate);
  const list = meds.filter(m => m.date === selectedKey).sort((a,b) => a.time.localeCompare(b.time));
  selectedDateTitle.textContent = formatLong(selectedDate);
  medCount.textContent = `${list.length} ${list.length === 1 ? "remédio" : "remédios"}`;

  const completed = list.filter(m => taken[`${selectedKey}-${m.id}`]).length;
  summaryNumber.textContent = `${completed}/${list.length}`;
  summaryText.textContent = list.length
    ? completed === list.length ? "Todos os horários foram concluídos." : `${list.length - completed} horário(s) pendente(s).`
    : "Nenhum horário cadastrado.";
  agendaProgress.style.width = list.length ? `${completed/list.length*100}%` : "0%";

  medicationList.innerHTML = "";

  if (!list.length) {
    medicationList.innerHTML = `
      <div class="empty-state">
        <div>💊</div>
        <h3>Nenhum medicamento neste dia</h3>
        <p>Adicione uma medicação para começar sua rotina.</p>
        <button class="secondary-btn" onclick="openModal()">Adicionar medicamento</button>
      </div>`;
    return;
  }

  list.forEach(m => {
    const done = !!taken[`${selectedKey}-${m.id}`];
    const card = document.createElement("div");
    card.className = `med-item ${done ? "done" : ""}`;
    card.innerHTML = `
      <button class="check-med" aria-label="Marcar como tomado">${done ? "✓" : ""}</button>
      <div class="med-time">${m.time}</div>
      <div class="med-info">
        <h3>${escapeHtml(m.name)}</h3>
        <p>${escapeHtml(m.dose)}${m.note ? ` · ${escapeHtml(m.note)}` : ""}</p>
      </div>
      <button class="delete-med" aria-label="Excluir">×</button>
    `;

    card.querySelector(".check-med").onclick = () => {
      const k = `${selectedKey}-${m.id}`;
      if (taken[k]) delete taken[k]; else taken[k] = true;
      save(); renderCalendar(); renderDay();
    };

    card.querySelector(".delete-med").onclick = () => {
      meds = meds.filter(item => item.id !== m.id);
      delete taken[`${selectedKey}-${m.id}`];
      save(); renderCalendar(); renderDay();
    };

    medicationList.appendChild(card);
  });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function openModal() {
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  modal.querySelector("input").focus();
}
window.openModal = openModal;

document.getElementById("openModal").onclick = openModal;
document.getElementById("closeModal").onclick = () => modal.classList.remove("open");
modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });

document.getElementById("prevMonth").onclick = () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()-1, 1);
  renderCalendar();
};
document.getElementById("nextMonth").onclick = () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth()+1, 1);
  renderCalendar();
};

document.getElementById("medForm").onsubmit = e => {
  e.preventDefault();
  const form = new FormData(e.target);
  meds.push({
    id: Date.now().toString(),
    name: form.get("name").trim(),
    dose: form.get("dose").trim(),
    time: form.get("time"),
    note: form.get("note").trim(),
    date: key(selectedDate)
  });
  save();
  e.target.reset();
  modal.classList.remove("open");
  renderCalendar();
  renderDay();
};

renderCalendar();
renderDay();
