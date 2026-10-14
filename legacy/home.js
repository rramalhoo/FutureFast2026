
const meds = JSON.parse(localStorage.getItem("genvityMeds") || "[]");
const taken = JSON.parse(localStorage.getItem("genvityTaken") || "{}");
const todayKey = new Date().toISOString().slice(0,10);
const todayMeds = meds.filter(m => m.date === todayKey || !m.date);
const completed = todayMeds.filter(m => taken[`${todayKey}-${m.id}`]).length;

document.getElementById("progressText").textContent = `${completed} de ${todayMeds.length} tomadas`;
document.getElementById("progressBar").style.width =
  todayMeds.length ? `${(completed / todayMeds.length) * 100}%` : "0%";

document.getElementById("progressHint").textContent =
  todayMeds.length
    ? completed === todayMeds.length ? "Tudo certo por hoje! 💜" : "Você está indo bem. Continue acompanhando."
    : "Cadastre seus medicamentos na agenda.";

const now = new Date();
const upcoming = todayMeds
  .filter(m => !taken[`${todayKey}-${m.id}`])
  .sort((a,b) => a.time.localeCompare(b.time))
  .find(m => m.time >= now.toTimeString().slice(0,5));

const fallback = todayMeds
  .filter(m => !taken[`${todayKey}-${m.id}`])
  .sort((a,b) => a.time.localeCompare(b.time))[0];

const next = upcoming || fallback;
if (next) {
  document.getElementById("nextMedicine").textContent = next.name;
  document.getElementById("nextTime").textContent = `${next.time} · ${next.dose}`;
} else if (todayMeds.length) {
  document.getElementById("nextMedicine").textContent = "Rotina concluída";
  document.getElementById("nextTime").textContent = "Você não tem mais horários pendentes hoje.";
}
