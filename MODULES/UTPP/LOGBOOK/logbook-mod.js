(function () {
  const LOGBOOK = {
    storageBase: "logbook-v1",
    state: {
      userId: "guest",
      username: "Personnage",
      activeTab: "passport",
      data: {
        passport: {
          quote: "",
          status: "Disponible",
          avatar: ""
        },
        deck: [],
        sparks: [],
        notepad: ""
      }
    }
  };

  function detectUser() {
    const data = window._userdata || {};

    LOGBOOK.state.userId = data.user_id
      ? String(data.user_id).trim()
      : "guest";

    LOGBOOK.state.username = data.username
      ? String(data.username).trim()
      : "Personnage";
  }

  function getStorageKey() {
    return `${LOGBOOK.storageBase}-${LOGBOOK.state.userId}`;
  }

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(getStorageKey()) || "{}");

      LOGBOOK.state.data = {
        passport: {
          quote: saved.passport?.quote || "",
          status: saved.passport?.status || "Disponible",
          avatar: saved.passport?.avatar || ""
        },
        deck: Array.isArray(saved.deck) ? saved.deck : [],
        sparks: Array.isArray(saved.sparks) ? saved.sparks : [],
        notepad: saved.notepad || ""
      };
    } catch (error) {
      LOGBOOK.state.data = {
        passport: {
          quote: "",
          status: "Disponible",
          avatar: ""
        },
        deck: [],
        sparks: [],
        notepad: ""
      };
    }
  }

  function saveData() {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(LOGBOOK.state.data));
    } catch (error) {
      /* localStorage indisponible : on ignore proprement */
    }
  }

  function createInterface() {
    if (document.querySelector("#logbook-root")) return;

    const savedAvatar = LOGBOOK.state.data.passport.avatar;
    const avatarHTML = savedAvatar
      ? `<img src="${escapeHTML(savedAvatar)}" alt="${escapeHTML(LOGBOOK.state.username)}">`
      : escapeHTML(getInitials(LOGBOOK.state.username));

    document.body.insertAdjacentHTML("beforeend", `
      <section id="logbook-root" class="logbook-closed" aria-hidden="true">
        <header id="logbook-header">
          <div>
            <strong>Logbook</strong>
            <span>Cockpit personnel</span>
          </div>

          <button id="logbook-close" type="button" aria-label="Fermer le Logbook">×</button>
        </header>

        <nav id="logbook-tabs" aria-label="Sections du Logbook">
          <button class="logbook-tab is-active" type="button" data-logbook-tab="passport">Passport</button>
          <button class="logbook-tab" type="button" data-logbook-tab="deck">On Deck</button>
          <button class="logbook-tab" type="button" data-logbook-tab="sparks">Sparks</button>
          <button class="logbook-tab" type="button" data-logbook-tab="notepad">Notepad</button>
        </nav>

        <div id="logbook-body">
          <section class="logbook-panel is-active" data-logbook-panel="passport">
            <div class="logbook-card">
              <div class="logbook-passport">
                <div class="logbook-avatar" id="logbook-avatar">
                  ${avatarHTML}
                </div>

                <div>
                  <div class="logbook-label">Passport</div>
                  <div class="logbook-username">${escapeHTML(LOGBOOK.state.username)}</div>
                  <div class="logbook-userid">ID utilisateur : ${escapeHTML(LOGBOOK.state.userId)}</div>
                </div>
              </div>

              <div class="logbook-field">
                <label for="logbook-status">Statut</label>
                <select id="logbook-status">
                  <option value="Disponible">Disponible</option>
                  <option value="Occupé">Occupé</option>
                  <option value="Cherche des liens">Cherche des liens</option>
                  <option value="Cherche un RP">Cherche un RP</option>
                  <option value="En pause">En pause</option>
                </select>
              </div>

              <div class="logbook-field">
                <label for="logbook-quote">Quote</label>
                <textarea id="logbook-quote" placeholder="Une phrase, une ambiance, une obsession du moment..."></textarea>
              </div>
            </div>
          </section>

          <section class="logbook-panel" data-logbook-panel="deck">
            <div class="logbook-card">
              <div class="logbook-card-head">
                <div class="logbook-label">On Deck</div>
                <div class="logbook-title">Ce qui attend une réponse</div>
              </div>

              <form id="logbook-deck-form" class="logbook-form">
                <div class="logbook-grid">
                  <input id="logbook-deck-title" type="text" placeholder="Titre du RP" required>

                  <select id="logbook-deck-priority">
                    <option value="low">Basse</option>
                    <option value="normal" selected>Normale</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                <input id="logbook-deck-url" type="text" placeholder="Lien du sujet">

                <textarea id="logbook-deck-note" placeholder="Petite note : contexte, partenaire, détail à ne pas oublier..."></textarea>

                <div class="logbook-actions">
                  <label class="logbook-check">
                    <input id="logbook-deck-turn" type="checkbox">
                    <span>À mon tour</span>
                  </label>

                  <button class="logbook-submit" type="submit">Ajouter</button>
                </div>
              </form>
            </div>

            <div id="logbook-deck-list" class="logbook-list"></div>
          </section>

          <section class="logbook-panel" data-logbook-panel="sparks">
            <div class="logbook-card">
              <div class="logbook-card-head">
                <div class="logbook-label">Sparks</div>
                <div class="logbook-title">Vos envies avant de les proposer</div>
              </div>

              <form id="logbook-sparks-form" class="logbook-form">
                <input id="logbook-sparks-target" type="text" placeholder="Personnage ciblé / pseudo / idée sans cible">

                <div class="logbook-grid">
                  <select id="logbook-sparks-type">
                    <option value="lien">Lien</option>
                    <option value="rp">RP</option>
                    <option value="drama">Drama</option>
                    <option value="evolution">Évolution</option>
                    <option value="vague">Idée vague</option>
                  </select>

                  <select id="logbook-sparks-status">
                    <option value="a-proposer">À proposer</option>
                    <option value="propose">Proposé</option>
                    <option value="valide">Validé</option>
                    <option value="abandonne">Abandonné</option>
                  </select>
                </div>

                <textarea id="logbook-sparks-note" placeholder="Votre envie, idée, scène, twist, relation, détail à garder sous le coude..."></textarea>

                <div class="logbook-actions">
                  <span class="logbook-check">Une étincelle à ne pas perdre.</span>
                  <button class="logbook-submit" type="submit">Ajouter</button>
                </div>
              </form>
            </div>

            <div id="logbook-sparks-list" class="logbook-list"></div>
          </section>

          <section class="logbook-panel" data-logbook-panel="notepad">
            <div class="logbook-card">
              <div class="logbook-card-head">
                <div class="logbook-label">Notepad</div>
                <div class="logbook-title">Vos notes privées</div>
              </div>

              <div class="logbook-field">
                <label for="logbook-notepad">Bloc-notes libre</label>
                <textarea id="logbook-notepad" placeholder="Notes perso, idées de scènes, phrases à garder, détails de chrono, rappels..."></textarea>
              </div>
            </div>
          </section>
        </div>
      </section>
    `);

    bindEvents();
    fillFields();
    renderDeck();
    renderSparks();
    loadAvatar();

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function bindEvents() {
    const toggle = document.querySelector("#logbook-toggle");
    const close = document.querySelector("#logbook-close");
    const quote = document.querySelector("#logbook-quote");
    const status = document.querySelector("#logbook-status");
    const notepad = document.querySelector("#logbook-notepad");

    const deckForm = document.querySelector("#logbook-deck-form");
    const deckList = document.querySelector("#logbook-deck-list");

    const sparksForm = document.querySelector("#logbook-sparks-form");
    const sparksList = document.querySelector("#logbook-sparks-list");

    if (toggle) {
      toggle.addEventListener("click", toggleLogbook);
    }

    if (close) {
      close.addEventListener("click", closeLogbook);
    }

    document.addEventListener("click", function (event) {
      const tab = event.target.closest("[data-logbook-tab]");

      if (!tab) return;

      switchTab(tab.dataset.logbookTab);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeLogbook();
      }
    });

    if (quote) {
      quote.addEventListener("input", function () {
        LOGBOOK.state.data.passport.quote = quote.value;
        saveData();
      });
    }

    if (status) {
      status.addEventListener("change", function () {
        LOGBOOK.state.data.passport.status = status.value;
        saveData();
      });
    }

    if (notepad) {
      notepad.addEventListener("input", function () {
        LOGBOOK.state.data.notepad = notepad.value;
        saveData();
      });
    }

    if (deckForm) {
      deckForm.addEventListener("submit", handleDeckSubmit);
    }

    if (deckList) {
      deckList.addEventListener("click", handleDeckClick);
      deckList.addEventListener("change", handleDeckChange);
    }

    if (sparksForm) {
      sparksForm.addEventListener("submit", handleSparksSubmit);
    }

    if (sparksList) {
      sparksList.addEventListener("click", handleSparksClick);
      sparksList.addEventListener("change", handleSparksChange);
    }
  }

  function fillFields() {
    const quote = document.querySelector("#logbook-quote");
    const status = document.querySelector("#logbook-status");
    const notepad = document.querySelector("#logbook-notepad");

    if (quote) {
      quote.value = LOGBOOK.state.data.passport.quote || "";
    }

    if (status) {
      status.value = LOGBOOK.state.data.passport.status || "Disponible";
    }

    if (notepad) {
      notepad.value = LOGBOOK.state.data.notepad || "";
    }
  }

  function handleDeckSubmit(event) {
    event.preventDefault();

    const title = document.querySelector("#logbook-deck-title");
    const url = document.querySelector("#logbook-deck-url");
    const note = document.querySelector("#logbook-deck-note");
    const priority = document.querySelector("#logbook-deck-priority");
    const turn = document.querySelector("#logbook-deck-turn");

    if (!title || !title.value.trim()) return;

    const item = {
      id: createId(),
      title: title.value.trim(),
      url: normalizeUrl(url?.value || ""),
      note: note?.value.trim() || "",
      priority: priority?.value || "normal",
      myTurn: !!turn?.checked,
      createdAt: Date.now()
    };

    LOGBOOK.state.data.deck.unshift(item);
    saveData();
    renderDeck();

    title.value = "";
    if (url) url.value = "";
    if (note) note.value = "";
    if (priority) priority.value = "normal";
    if (turn) turn.checked = false;

    title.focus();
  }

  function handleDeckClick(event) {
    const deleteButton = event.target.closest("[data-logbook-deck-delete]");

    if (!deleteButton) return;

    const id = deleteButton.dataset.logbookDeckDelete;

    LOGBOOK.state.data.deck = LOGBOOK.state.data.deck.filter(function (item) {
      return item.id !== id;
    });

    saveData();
    renderDeck();
  }

  function handleDeckChange(event) {
    const turnInput = event.target.closest("[data-logbook-deck-turn]");

    if (!turnInput) return;

    const id = turnInput.dataset.logbookDeckTurn;
    const item = LOGBOOK.state.data.deck.find(function (entry) {
      return entry.id === id;
    });

    if (!item) return;

    item.myTurn = turnInput.checked;

    saveData();
    renderDeck();
  }

  function renderDeck() {
    const list = document.querySelector("#logbook-deck-list");
    if (!list) return;

    const items = LOGBOOK.state.data.deck || [];

    if (!items.length) {
      list.innerHTML = `
        <div class="logbook-placeholder">
          Rien dans la file pour le moment. Ajoutez un RP à surveiller, une réponse à faire, ou un sujet à ne pas oublier.
        </div>
      `;
      return;
    }

    list.innerHTML = items.map(function (item) {
      const priorityLabel = getPriorityLabel(item.priority);
      const titleHTML = item.url
        ? `<a class="logbook-entry-title" href="${escapeHTML(item.url)}">${escapeHTML(item.title)}</a>`
        : `<div class="logbook-entry-title">${escapeHTML(item.title)}</div>`;

      return `
        <article class="logbook-entry ${item.myTurn ? "is-turn" : ""}">
          <div class="logbook-entry-top">
            ${titleHTML}

            <button class="logbook-delete" type="button" data-logbook-deck-delete="${escapeHTML(item.id)}" aria-label="Supprimer ce RP">×</button>
          </div>

          ${item.note ? `<div class="logbook-entry-note">${escapeHTML(item.note)}</div>` : ""}

          <div class="logbook-entry-meta">
            <span class="logbook-priority" data-priority="${escapeHTML(item.priority)}">${escapeHTML(priorityLabel)}</span>
            ${item.myTurn ? `<span class="logbook-turn-chip">À mon tour</span>` : ""}
          </div>

          <div class="logbook-entry-footer">
            <label class="logbook-entry-check">
              <input type="checkbox" data-logbook-deck-turn="${escapeHTML(item.id)}" ${item.myTurn ? "checked" : ""}>
              <span>À mon tour</span>
            </label>
          </div>
        </article>
      `;
    }).join("");
  }

  function handleSparksSubmit(event) {
    event.preventDefault();

    const target = document.querySelector("#logbook-sparks-target");
    const type = document.querySelector("#logbook-sparks-type");
    const status = document.querySelector("#logbook-sparks-status");
    const note = document.querySelector("#logbook-sparks-note");

    const targetValue = target?.value.trim() || "";
    const noteValue = note?.value.trim() || "";

    if (!targetValue && !noteValue) return;

    const item = {
      id: createId(),
      target: targetValue,
      type: type?.value || "vague",
      status: status?.value || "a-proposer",
      note: noteValue,
      createdAt: Date.now()
    };

    LOGBOOK.state.data.sparks.unshift(item);
    saveData();
    renderSparks();

    if (target) target.value = "";
    if (type) type.value = "lien";
    if (status) status.value = "a-proposer";
    if (note) note.value = "";

    if (target) target.focus();
  }

  function handleSparksClick(event) {
    const deleteButton = event.target.closest("[data-logbook-spark-delete]");

    if (!deleteButton) return;

    const id = deleteButton.dataset.logbookSparkDelete;

    LOGBOOK.state.data.sparks = LOGBOOK.state.data.sparks.filter(function (item) {
      return item.id !== id;
    });

    saveData();
    renderSparks();
  }

  function handleSparksChange(event) {
    const statusSelect = event.target.closest("[data-logbook-spark-status]");

    if (!statusSelect) return;

    const id = statusSelect.dataset.logbookSparkStatus;
    const item = LOGBOOK.state.data.sparks.find(function (entry) {
      return entry.id === id;
    });

    if (!item) return;

    item.status = statusSelect.value;

    saveData();
    renderSparks();
  }

  function renderSparks() {
    const list = document.querySelector("#logbook-sparks-list");
    if (!list) return;

    const items = LOGBOOK.state.data.sparks || [];

    if (!items.length) {
      list.innerHTML = `
        <div class="logbook-placeholder">
          Aucune étincelle pour le moment. Notez une envie de lien, une idée de scène, un drama potentiel ou une évolution à proposer.
        </div>
      `;
      return;
    }

    list.innerHTML = items.map(function (item) {
      const target = item.target || "Idée sans cible";
      const typeLabel = getSparkTypeLabel(item.type);
      const statusLabel = getSparkStatusLabel(item.status);

      return `
        <article class="logbook-entry">
          <div class="logbook-entry-top">
            <div class="logbook-spark-target">
              ${escapeHTML(target)}
              ${!item.target ? `<span> — libre</span>` : ""}
            </div>

            <button class="logbook-delete" type="button" data-logbook-spark-delete="${escapeHTML(item.id)}" aria-label="Supprimer cette envie">×</button>
          </div>

          ${item.note ? `<div class="logbook-entry-note">${escapeHTML(item.note)}</div>` : ""}

          <div class="logbook-entry-meta">
            <span class="logbook-spark-type">${escapeHTML(typeLabel)}</span>
            <span class="logbook-spark-status" data-status="${escapeHTML(item.status)}">${escapeHTML(statusLabel)}</span>
          </div>

          <div class="logbook-entry-footer">
            <select class="logbook-mini-select" data-logbook-spark-status="${escapeHTML(item.id)}" aria-label="Changer le statut">
              ${getSparkStatusOptions(item.status)}
            </select>
          </div>
        </article>
      `;
    }).join("");
  }

  function getPriorityLabel(priority) {
    if (priority === "low") return "Basse";
    if (priority === "urgent") return "Urgente";
    return "Normale";
  }

  function getSparkTypeLabel(type) {
    if (type === "lien") return "Lien";
    if (type === "rp") return "RP";
    if (type === "drama") return "Drama";
    if (type === "evolution") return "Évolution";
    return "Idée vague";
  }

  function getSparkStatusLabel(status) {
    if (status === "propose") return "Proposé";
    if (status === "valide") return "Validé";
    if (status === "abandonne") return "Abandonné";
    return "À proposer";
  }

  function getSparkStatusOptions(currentStatus) {
    const statuses = [
      ["a-proposer", "À proposer"],
      ["propose", "Proposé"],
      ["valide", "Validé"],
      ["abandonne", "Abandonné"]
    ];

    return statuses.map(function ([value, label]) {
      return `<option value="${escapeHTML(value)}" ${currentStatus === value ? "selected" : ""}>${escapeHTML(label)}</option>`;
    }).join("");
  }

  function normalizeUrl(url) {
    const clean = String(url || "").trim();

    if (!clean) return "";
    if (/^(https?:|\/|#)/i.test(clean)) return clean;

    return `https://${clean}`;
  }

  function toggleLogbook() {
    if (isLogbookOpen()) {
      closeLogbook();
    } else {
      openLogbook();
    }
  }

  function openLogbook() {
    const root = document.querySelector("#logbook-root");
    const toggle = document.querySelector("#logbook-toggle");

    if (!root) return;

    root.classList.remove("logbook-closed");
    root.setAttribute("aria-hidden", "false");

    if (toggle) {
      toggle.classList.add("is-active");
      toggle.setAttribute("aria-expanded", "true");
    }
  }

  function closeLogbook() {
    const root = document.querySelector("#logbook-root");
    const toggle = document.querySelector("#logbook-toggle");

    if (!root) return;

    root.classList.add("logbook-closed");
    root.setAttribute("aria-hidden", "true");

    if (toggle) {
      toggle.classList.remove("is-active");
      toggle.setAttribute("aria-expanded", "false");
    }
  }

  function isLogbookOpen() {
    const root = document.querySelector("#logbook-root");
    return !!root && !root.classList.contains("logbook-closed");
  }

  function switchTab(tabName) {
    LOGBOOK.state.activeTab = tabName;

    document.querySelectorAll("[data-logbook-tab]").forEach(function (tab) {
      tab.classList.toggle("is-active", tab.dataset.logbookTab === tabName);
    });

    document.querySelectorAll("[data-logbook-panel]").forEach(function (panel) {
      panel.classList.toggle("is-active", panel.dataset.logbookPanel === tabName);
    });
  }

  function loadAvatar() {
    const userId = LOGBOOK.state.userId;
    const username = LOGBOOK.state.username;
    const avatarBox = document.querySelector("#logbook-avatar");

    if (!avatarBox || userId === "guest") return;

    if (LOGBOOK.state.data.passport.avatar) return;

    fetch(`/u${encodeURIComponent(userId)}`)
      .then(function (response) {
        return response.text();
      })
      .then(function (html) {
        const doc = new DOMParser().parseFromString(html, "text/html");

        const avatar =
          Array.from(doc.querySelectorAll("img"))
            .find(function (img) {
              return img.alt?.trim().toLowerCase() === username.trim().toLowerCase();
            }) ||
          Array.from(doc.querySelectorAll("img"))
            .find(function (img) {
              return /zupimages|servimg|imgfast|illiweb|2img/i.test(img.src) && !/icon_|logo/i.test(img.src);
            });

        if (avatar?.src) {
          LOGBOOK.state.data.passport.avatar = avatar.src;
          saveData();

          avatarBox.innerHTML = `<img src="${escapeHTML(avatar.src)}" alt="${escapeHTML(username)}">`;
        }
      })
      .catch(function () {
        avatarBox.textContent = getInitials(username);
      });
  }

  function createId() {
    return `logbook-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getInitials(name) {
    return String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) {
        return part[0] || "";
      })
      .join("")
      .toUpperCase();
  }

  function escapeHTML(str) {
    return String(str || "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  }

  function init() {
    detectUser();
    loadData();
    createInterface();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
