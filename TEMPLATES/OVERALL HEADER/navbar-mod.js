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
    const label = getCleanLabel(link);
    const icon = iconFromHref(link);

    link.dataset.utppReady = "1";
    link.dataset.tip = label;
    link.setAttribute("aria-label", label);
    link.removeAttribute("title");
    link.style.setProperty("--utpp-icon", `url("${LUCIDE_BASE}${icon}.svg")`);

    if (!link.querySelector(".link-text")) {
      link.textContent = "";

      const span = document.createElement("span");
      span.className = "link-text";
      span.textContent = label;

      link.appendChild(span);
    }
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

    const openBracket = document.createElement("span");
    openBracket.className = "utpp-navProfileBracket";
    openBracket.textContent = "[";

    const name = document.createElement("span");
    name.className = "utpp-navProfileName";
    name.textContent = `(${username})`;

    const closeBracket = document.createElement("span");
    closeBracket.className = "utpp-navProfileBracket";
    closeBracket.textContent = "]";

    /* Résultat : AVATAR [ (Pseudo) ] */
    profile.append(avatar, openBracket, name, closeBracket);

    return profile;
  };

  const getRestGap = (navig) => {
    const styles = window.getComputedStyle(navig);
    const cssVar = styles.getPropertyValue("--utpp-nav-rest-gap");
    const value = parseFloat(cssVar);

    if (!Number.isNaN(value)) return value;

    const marginTop = parseFloat(styles.marginTop);
    return Number.isNaN(marginTop) ? 0 : marginTop;
  };

  const setupStickyState = (navbar, navig) => {
    if (navbar.dataset.utppStickyReady === "1") return;

    navbar.dataset.utppStickyReady = "1";

    let sentinel = navbar.previousElementSibling;

    if (!sentinel || !sentinel.classList.contains("utpp-navbarSentinel")) {
      sentinel = document.createElement("span");
      sentinel.className = "utpp-navbarSentinel";
      sentinel.setAttribute("aria-hidden", "true");
      navbar.parentNode.insertBefore(sentinel, navbar);
    }

    const restGap = getRestGap(navig);

    const updateState = () => {
      const sentinelBottom = sentinel.getBoundingClientRect().bottom;

      /*
        On active .scrolled quand la barre VISUELLE touche le haut.
        Comme la barre a une marge haute au repos, on tient compte de cette marge.
      */
      const shouldBeScrolled = sentinelBottom <= -restGap;

      navbar.classList.toggle("scrolled", shouldBeScrolled);
    };

    window.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState, { passive: true });

    requestAnimationFrame(updateState);
    setTimeout(updateState, 250);
  };

  const buildNavbar = () => {
    const navbar = document.querySelector(NAVBAR_SELECTOR);
    if (!navbar) return false;

    const navig = navbar.querySelector(NAVIG_SELECTOR);
    if (!navig) return false;

    let left = navig.querySelector(".utpp-navLeft");
    let center = navig.querySelector(".utpp-navCenter");
    let right = navig.querySelector(".utpp-navRight");

    if (!center) {
      left = document.createElement("div");
      left.className = "utpp-navLeft";

      center = document.createElement("nav");
      center.className = "utpp-navCenter";
      center.setAttribute("aria-label", "Navigation principale");

      right = document.createElement("div");
      right.className = "utpp-navRight";
      right.setAttribute("aria-label", "Modules rapides");

      while (navig.firstChild) {
        center.appendChild(navig.firstChild);
      }

      left.appendChild(center);
      navig.append(left, right);
    }

    if (!left) {
      left = document.createElement("div");
      left.className = "utpp-navLeft";
      navig.insertBefore(left, navig.firstChild);
      left.appendChild(center);
    }

    if (!right) {
      right = document.createElement("div");
      right.className = "utpp-navRight";
      right.setAttribute("aria-label", "Modules rapides");
      navig.appendChild(right);
    }

    const oldProfile = left.querySelector(".utpp-navProfile");
    const newProfile = createProfile();

    if (oldProfile) {
      oldProfile.replaceWith(newProfile);
    } else {
      left.insertBefore(newProfile, center);
    }

    center.querySelectorAll("a.mainmenu").forEach(prepareLink);

    setupStickyState(navbar, navig);

    return true;
  };

  let observer;

  const boot = () => {
    const ready = buildNavbar();

    if (ready && observer) {
      observer.disconnect();
    }
  };

  observer = new MutationObserver(boot);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);

  boot();
})();
