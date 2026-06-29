(function () {
  const STORAGE_KEY = "rpg-player-panel-state";
  const PANEL_SELECTOR = "#rpg-player-panel";
  const TOGGLE_SELECTOR = "[data-rpg-panel-toggle]";

  const rpgPanelData = {
    weather: {
      city: "Philadelphie, Pennsylvanie",
      temp: "24°C",
      state: "Ciel lourd sur la ville",
      note: "L’air est humide, les rues gardent la chaleur du bitume, et une brise tiède remonte depuis la Delaware River."
    },

    announcement: {
      title: "Dernière annonce",
      text: "Le staff rappelle que l’event mensuel est ouvert. Pensez à consulter les sujets communs avant de lancer vos réponses.",
      link: "/f5-annonces"
    },

    bonus: {
      moon: "Lune gibbeuse croissante",
      rumor: "On raconte que plusieurs lumières ont été aperçues tard dans la nuit près des docks.",
      currentEvent: "Event d’été : tensions en ville"
    },

    calendarEvents: {
      1: ["Début du mois RP"],
      4: ["Feu d’artifice dans plusieurs quartiers"],
      12: ["Animation HRP"],
      18: ["Rumeur majeure disponible"],
      27: ["Event commun : scène ouverte"],
      31: ["Fin du mois RP"]
    }
  };

  function getSavedState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function saveState(patch) {
    const currentState = getSavedState();
    const nextState = Object.assign({}, currentState, patch);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (error) {
      /* localStorage indisponible : on ignore proprement */
    }
  }

  function getToggleButtons() {
    return document.querySelectorAll(TOGGLE_SELECTOR);
  }

  function setPanelOpen(panel, isOpen) {
    panel.classList.toggle("rpg-panel--closed", !isOpen);
    panel.setAttribute("aria-hidden", String(!isOpen));

    getToggleButtons().forEach(function (button) {
      button.setAttribute("aria-expanded", String(isOpen));
      button.classList.toggle("is-active", isOpen);
    });

    saveState({ isOpen: isOpen });
  }

  function setPanelTheme(panel, theme) {
    const themeButton = panel.querySelector("[data-rpg-theme-btn]");

    panel.dataset.rpgTheme = theme;

    if (themeButton) {
      themeButton.textContent = theme === "dark" ? "☀" : "☾";
      themeButton.setAttribute(
        "aria-label",
        theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"
      );
    }

    saveState({ theme: theme });
  }

  function fillPanelText(panel) {
    const city = panel.querySelector("[data-rpg-weather-city]");
    const temp = panel.querySelector("[data-rpg-weather-temp]");
    const state = panel.querySelector("[data-rpg-weather-state]");
    const note = panel.querySelector("[data-rpg-weather-note]");

    if (city) city.textContent = rpgPanelData.weather.city;
    if (temp) temp.textContent = rpgPanelData.weather.temp;
    if (state) state.textContent = rpgPanelData.weather.state;
    if (note) note.textContent = rpgPanelData.weather.note;

    const noticeTitle = panel.querySelector("[data-rpg-notice-title]");
    const noticeText = panel.querySelector("[data-rpg-notice-text]");
    const noticeLink = panel.querySelector("[data-rpg-notice-link]");

    if (noticeTitle) noticeTitle.textContent = rpgPanelData.announcement.title;
    if (noticeText) noticeText.textContent = rpgPanelData.announcement.text;

    if (noticeLink) {
      noticeLink.href = rpgPanelData.announcement.link;
    }

    const moon = panel.querySelector("[data-rpg-moon]");
    const rumor = panel.querySelector("[data-rpg-rumor]");
    const currentEvent = panel.querySelector("[data-rpg-current-event]");

    if (moon) moon.textContent = rpgPanelData.bonus.moon;
    if (rumor) rumor.textContent = rpgPanelData.bonus.rumor;
    if (currentEvent) currentEvent.textContent = rpgPanelData.bonus.currentEvent;
  }

  function initCalendar(panel) {
    const calendar = panel.querySelector(".rpg-calendar");
    const grid = panel.querySelector(".rpg-calendar__grid");
    const title = panel.querySelector(".rpg-calendar__title");

    if (!calendar || !grid) return;

    const today = new Date();

    const year = Number(panel.dataset.year) || today.getFullYear();
    const monthHuman = Number(panel.dataset.month) || today.getMonth() + 1;
    const monthIndex = Math.min(12, Math.max(1, monthHuman)) - 1;

    const monthDate = new Date(year, monthIndex, 1);

    const titleText = new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric"
    }).format(monthDate);

    if (title) {
      title.textContent = titleText;
    }

    grid.innerHTML = "";

    const daysOfWeek = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

    daysOfWeek.forEach(function (dayName) {
      const dayOfWeek = document.createElement("div");
      dayOfWeek.className = "rpg-calendar__weekday";
      dayOfWeek.textContent = dayName;
      grid.appendChild(dayOfWeek);
    });

    const firstDayOfMonth = new Date(year, monthIndex, 1);
    const startingDay = (firstDayOfMonth.getDay() + 6) % 7;

    for (let i = 0; i < startingDay; i++) {
      const placeholder = document.createElement("div");
      placeholder.className = "rpg-calendar__placeholder";
      grid.appendChild(placeholder);
    }

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
      const dayButton = document.createElement("button");
      dayButton.type = "button";
      dayButton.className = "rpg-calendar__day";
      dayButton.dataset.day = String(dayNumber);

      const dayLabel = document.createElement("span");
      dayLabel.textContent = dayNumber;

      const dayEvents = rpgPanelData.calendarEvents[dayNumber] || [];
      const hasEvent = dayEvents.length > 0;
      const eventText = hasEvent
        ? dayEvents.join(" — ")
        : "Aucun évènement aujourd'hui";

      const tooltip = document.createElement("span");
      tooltip.className = "rpg-calendar__event";
      tooltip.textContent = eventText;

      if (hasEvent) {
        dayButton.classList.add("rpg-calendar__day--has-event");
      }

      dayButton.title = eventText;
      dayButton.setAttribute(
        "aria-label",
        `${dayNumber} ${titleText} : ${eventText}`
      );

      dayButton.appendChild(dayLabel);
      dayButton.appendChild(tooltip);

      dayButton.addEventListener("click", function () {
        alert(`${dayNumber} ${titleText}\n${eventText}`);
      });

      grid.appendChild(dayButton);
    }

    function updateCurrentDay() {
      const now = new Date();

      const isCurrentMonth =
        now.getFullYear() === year && now.getMonth() === monthIndex;

      const days = grid.querySelectorAll(".rpg-calendar__day");

      days.forEach(function (dayElement) {
        const isCurrentDay =
          isCurrentMonth &&
          Number(dayElement.dataset.day) === now.getDate();

        dayElement.classList.toggle("rpg-calendar__day--current", isCurrentDay);
      });
    }

    updateCurrentDay();
    setInterval(updateCurrentDay, 60000);
  }

  function applySavedState(panel) {
    const state = getSavedState();

    if (state.theme === "light" || state.theme === "dark") {
      setPanelTheme(panel, state.theme);
    } else {
      setPanelTheme(panel, panel.dataset.rpgTheme || "dark");
    }

    if (typeof state.isOpen === "boolean") {
      setPanelOpen(panel, state.isOpen);
    } else {
      setPanelOpen(panel, false);
    }
  }

  function initPanel(panel) {
    const closeButton = panel.querySelector("[data-rpg-close]");
    const themeButton = panel.querySelector("[data-rpg-theme-btn]");

    applySavedState(panel);
    fillPanelText(panel);
    initCalendar(panel);

    getToggleButtons().forEach(function (button) {
      button.addEventListener("click", function () {
        const isCurrentlyOpen = !panel.classList.contains("rpg-panel--closed");
        setPanelOpen(panel, !isCurrentlyOpen);
      });
    });

    if (closeButton) {
      closeButton.addEventListener("click", function () {
        setPanelOpen(panel, false);
      });
    }

    if (themeButton) {
      themeButton.addEventListener("click", function () {
        const currentTheme = panel.dataset.rpgTheme || "dark";
        const nextTheme = currentTheme === "dark" ? "light" : "dark";

        setPanelTheme(panel, nextTheme);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setPanelOpen(panel, false);
      }
    });
  }

  function bootPanel() {
    const panel = document.querySelector(PANEL_SELECTOR) || document.querySelector(".rpg-panel");

    if (!panel) return;

    initPanel(panel);

    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootPanel, { once: true });
  } else {
    bootPanel();
  }
})();
