const health = document.querySelector("#health");

async function checkHealth() {
  try {
    const response = await fetch("/api/health", {
      headers: { accept: "application/json" }
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error("Worker indisponível");
    }

    health.textContent = "Worker conectado ✓";
    health.classList.add("ok");
  } catch (error) {
    health.textContent = "Não foi possível conectar ao Worker.";
    health.classList.add("error");
  }
}

checkHealth();
