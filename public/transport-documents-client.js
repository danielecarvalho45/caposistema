(() => {
  "use strict";
  const form = document.getElementById("access-form");
  const input = document.getElementById("access-pin");
  const status = document.getElementById("status");
  const list = document.getElementById("documents");
  const section = document.getElementById("files");
  const button = document.getElementById("open-documents");
  const token = new URLSearchParams(location.hash.replace(/^#/, "")).get("acesso") || "";
  if (!/^[a-f0-9]{64}$/.test(token)) {
    status.textContent = "Link incompleto ou inválido. Solicite o endereço correto ao CAPO.";
    button.disabled = true;
    return;
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    section.hidden = true;
    list.replaceChildren();
    const pin = input.value.trim();
    if (!/^[0-9]{8}$/.test(pin)) {
      status.textContent = "Digite o código de oito dígitos.";
      return;
    }
    button.disabled = true;
    status.textContent = "Verificando o acesso aos documentos…";
    try {
      const response = await fetch("https://fftebavlhbfcrvrtnrld.supabase.co/functions/v1/transport-share-access", {
        method: "POST", mode: "cors", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, pin }),
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.documents)) {
        throw new Error(data.error || "Não foi possível acessar os documentos.");
      }
      for (const file of data.documents) {
        if (typeof file.name !== "string" || typeof file.url !== "string") continue;
        const li = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = file.name;
        li.appendChild(title);
        const actions = document.createElement("div");
        actions.className = "actions";
        const view = document.createElement("a");
        view.className = "action secondary";
        view.href = file.url;
        view.target = "_blank";
        view.rel = "noopener noreferrer";
        view.textContent = "Visualizar / imprimir";
        const download = document.createElement("a");
        download.className = "action";
        download.href = file.url;
        download.target = "_blank";
        download.rel = "noopener noreferrer";
        download.textContent = "Baixar PDF";
        actions.append(view, download);
        li.appendChild(actions);
        list.appendChild(li);
      }
      section.hidden = false;
      status.textContent = "Documentos liberados para visualização, download ou impressão. O PDF pode ser salvo usando o visualizador.";
      input.value = "";
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Não foi possível acessar os documentos.";
    } finally {
      button.disabled = false;
    }
  });
})();
