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
        notepad: saved.notepad || ""
      };
    } catch (error) {
      LOGBOOK.state.data = {
        passport: {
          quote: "",
          status: "Disponible",
          avatar: ""
        },
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
                  ${escapeHTML(getInitials(LOGBOOK.state.username))}
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

              <div class="logbook-text">
                Ici, on codera la file d’attente RP : titre, lien, note, priorité et case “à mon tour”.
              </div>
            </div>

            <div class="logbook-placeholder">
              Étape suivante : création des cartes RP avec ajout, suppression, priorité et sauvegarde automatique.
            </div>
          </section>

          <section class="logbook-panel" data-logbook-panel="sparks">
            <div class="logbook-card">
              <div class="logbook-card-head">
                <div class="logbook-label">Sparks</div>
                <div class="logbook-title">Vos envies avant de les proposer</div>
              </div>

              <div class="logbook-text">
                Ici, on codera les idées de liens, RP, drama, évolutions et envies vagues.
              </div>
            </div>

            <div class="logbook-placeholder">
              Étape suivante : fiches d’envies avec cible, type, statut et champ libre.
            </div>
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
