(() => {
  "use strict";
  const form = document.getElementById("access-form");
  const input = document.getElementById("access-pin");
  const status = document.getElementById("status");
  const list = document.getElementById("documents");
  const section = document.getElementById("files");
  const button = document.getElementById("open-documents");
  const notice = document.getElementById("expiry-notice");
  const params = new URLSearchParams(location.hash.replace(/^#/, ""));
  // Links novos usam #direto; links anteriores usam #acesso e preservam o PIN.
  const directToken = params.get("direto") || "";
  const isDirect = Boolean(directToken);
  const token = isDirect ? directToken : params.get("acesso") || "";

  if (!isDirect) {
    notice.textContent = "Para links anteriores, informe o código fornecido pelo CAPO. O prazo de acesso é o da emissão original.";
  } else {
    form.hidden = true;
  }
  if (!/^[a-f0-9]{64}$/.test(token)) {
    status.textContent = "Link incompleto ou inválido. Solicite o endereço correto ao CAPO.";
    form.hidden = true;
    return;
  }

  async function openDocuments(pin = "") {
    section.hidden = true;
    list.replaceChildren();
    if (!isDirect && !/^[0-9]{8}$/.test(pin)) {
      status.textContent = "Digite o código de oito dígitos.";
      return;
    }
    button.disabled = true;
    status.textContent = "Verificando o acesso à documentação…";
    try {
      const response = await fetch("https://fftebavlhbfcrvrtnrld.supabase.co/functions/v1/transport-share-access", {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isDirect ? { token } : { token, pin }),
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.documents)) {
        throw new Error(data.error || "Link indisponível. Solicite um novo link ao CAPO.");
      }

      if (data.access_expires_at) {
        const expiry = new Date(data.access_expires_at);
        if (!Number.isNaN(expiry.getTime())) {
          const dateLabel = expiry.toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short",
          });
          notice.textContent = "Atenção: visualize ou baixe a documentação até " + dateLabel
            + ". Após esse prazo, o link ficará indisponível.";
        }
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
        view.textContent = "Visualizar";

        const download = document.createElement("a");
        download.className = "action";
        download.href = typeof file.downloadUrl === "string" ? file.downloadUrl : file.url;
        download.target = "_blank";
        download.rel = "noopener noreferrer";
        download.textContent = "Baixar PDF";
        actions.append(view, download);
        li.appendChild(actions);
        list.appendChild(li);
      }
      section.hidden = false;
      status.textContent = "Documentos disponíveis. Visualize ou baixe os arquivos antes do vencimento do link.";
      input.value = "";
    } catch (error) {
      status.textContent = error instanceof Error
        ? error.message : "Link indisponível. Solicite outro ao CAPO.";
    } finally {
      button.disabled = false;
    }
  }

  if (isDirect) {
    void openDocuments();
  } else {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void openDocuments(input.value.trim());
    });
  }
})();
