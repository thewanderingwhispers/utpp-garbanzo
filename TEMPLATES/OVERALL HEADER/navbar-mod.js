(() => {
  const NAVBAR_SELECTOR = ".utpp-headerNavbar";
  const NAVIG_SELECTOR = ".utpp_navig";
  const LUCIDE_BASE = "https://unpkg.com/lucide-static/icons/";

  const iconFromHref = (link) => {
    const rawHref = (link.getAttribute("href") || "").toLowerCase();
    let path = rawHref;

    try {
      const url = new URL(rawHref, window.location.origin);
      path = `${url.pathname}${url.search}`.toLowerCase();
    } catch (e) {}

    if (rawHref.includes("logout=1")) return "log-out";

    if (path === "/" || path === "/forum") return "home";
    if (path.startsWith("/search")) return "search";
    if (path.startsWith("/memberlist")) return "users";
    if (path.startsWith("/groups")) return "users-round";
    if (path.startsWith("/profile")) return "user";
    if (path.startsWith("/privmsg")) return "mail";
    if (path.startsWith("/register")) return "user-plus";
    if (path.startsWith("/login")) return "log-in";
    if (path.startsWith("/calendar")) return "calendar-days";
    if (path.startsWith("/gallery")) return "images";
    if (path.startsWith("/images")) return "image";
    if (path.startsWith("/discover")) return "compass";
    if (path.startsWith("/faq")) return "circle-help";

    return "circle-dot";
  };

  const getCleanLabel = (link) => {
    const img = link.querySelector("img");

    return (
      link.getAttribute("title") ||
      img?.getAttribute("alt") ||
      link.textContent ||
      "Lien"
    )
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const prepareLink = (link) => {
    if (link.dataset.utppReady === "1") return;

    const label = getCleanLabel(link);
    const icon = iconFromHref(link);

    link.dataset.utppReady = "1";
    link.dataset.tip = label;
    link.setAttribute("aria-label", label);
    link.removeAttribute("title");
    link.style.setProperty("--utpp-icon", `url("${LUCIDE_BASE}${icon}.svg")`);

    link.textContent = "";

    const span = document.createElement("span");
    span.className = "link-text";
    span.textContent = label;

    link.appendChild(span);
  };

  const createProfile = () => {
    const data = window._userdata || {};
    const loggedIn = Number(data.session_logged_in) === 1;
    const userId = Number(data.user_id);
    const username = loggedIn && data.username ? data.username : "Invité";

    const profile = document.createElement("a");
    profile.className = "utpp-navProfile";
    profile.href = loggedIn && userId > 0 ? `/u${userId}` : "/login";
    profile.setAttribute(
      "aria-label",
      loggedIn ? `Profil de ${username}` : "Connexion"
    );

    const openBracket = document.createElement("span");
    openBracket.className = "utpp-navProfileBracket";
    openBracket.textContent = "[";

    const avatar = document.createElement("span");
    avatar.className = "utpp-navProfileAvatar";

    if (loggedIn && data.avatar) {
      avatar.innerHTML = data.avatar;
    } else {
      const fallback = document.createElement("span");
      fallback.className = "utpp-navProfileFallback";
      fallback.textContent = "?";
      avatar.appendChild(fallback);
    }

    const name = document.createElement("span");
    name.className = "utpp-navProfileName";
    name.textContent = `(${username})`;

    const closeBracket = document.createElement("span");
    closeBracket.className = "utpp-navProfileBracket";
    closeBracket.textContent = "]";

    profile.append(openBracket, avatar, name, closeBracket);

    return profile;
  };

  const setupStickyState = (navbar) => {
    if (navbar.dataset.utppStickyReady === "1") return;

    navbar.dataset.utppStickyReady = "1";

    const sentinel = document.createElement("span");
    sentinel.className = "utpp-navbarSentinel";
    sentinel.setAttribute("aria-hidden", "true");

    navbar.parentNode.insertBefore(sentinel, navbar);

    const updateState = () => {
      navbar.classList.toggle(
        "scrolled",
        sentinel.getBoundingClientRect().top < 0
      );
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          navbar.classList.toggle(
            "scrolled",
            entry.boundingClientRect.top < 0
          );
        },
        { threshold: [0] }
      );

      observer.observe(sentinel);
    } else {
      window.addEventListener("scroll", updateState, { passive: true });
    }

    window.addEventListener("resize", updateState, { passive: true });
    updateState();
  };

  const buildNavbar = () => {
    const navbar = document.querySelector(NAVBAR_SELECTOR);
    if (!navbar) return false;

    const navig = navbar.querySelector(NAVIG_SELECTOR);
    if (!navig) return false;

    let center = navig.querySelector(".utpp-navCenter");

    if (!center) {
      const left = document.createElement("div");
      left.className = "utpp-navLeft";

      const profile = createProfile();

      center = document.createElement("nav");
      center.className = "utpp-navCenter";
      center.setAttribute("aria-label", "Navigation principale");

      const right = document.createElement("div");
      right.className = "utpp-navRight";
      right.setAttribute("aria-label", "Modules rapides");

      while (navig.firstChild) {
        center.appendChild(navig.firstChild);
      }

      left.append(profile, center);
      navig.append(left, right);
    }

    center.querySelectorAll("a.mainmenu").forEach(prepareLink);
    setupStickyState(navbar);

    return true;
  };

  let mutationObserver;

  const boot = () => {
    const ready = buildNavbar();

    if (ready && mutationObserver) {
      mutationObserver.disconnect();
    }
  };

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);

  mutationObserver = new MutationObserver(boot);
  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  boot();
})();
