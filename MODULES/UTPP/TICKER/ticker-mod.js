$(function () {
  const KRSN_DEFAULT_AVATAR = "https://zupimages.net/up/26/20/z3y2.jpg";

  function KRSN_clean(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function KRSN_url(url) {
    if (!url) return "";
    if (url.startsWith("//")) return location.protocol + url;
    if (url.startsWith("/")) return location.origin + url;
    return url;
  }

  function KRSN_escape(text) {
    return $("<div>").text(text || "").html();
  }

  function KRSN_syncSidebar() {
    if (window.KRSN_syncPanelsSidebar) {
      window.KRSN_syncPanelsSidebar();
    }
  }

  function KRSN_buildPanel() {
    if ($("#KRSN-panel").length) return;

    $("body").append(`
      <div id="KRSN-panel">
        <div class="KRSN-head">
          <span><i data-lucide="activity"></i> Sujets récents</span>
          <button id="KRSN-close" type="button" title="Fermer">×</button>
        </div>

        <ul id="KRSN-list"></ul>
      </div>
    `);

    if (window.lucide) lucide.createIcons();
  }

  function KRSN_render(topics) {
    KRSN_buildPanel();

    const list = $("#KRSN-list");

    list.empty();
    $("#KRSN-count").text(topics.length || "");

    if (!topics.length) {
      list.html("<li class='KRSN-empty'>Aucun sujet récent trouvé.</li>");
      return;
    }

    topics.forEach(function (item) {
      list.append(`
        <li class="KRSN-item">
          <img class="KRSN-avatar" src="${KRSN_escape(item.avatar)}" alt="">

          <div class="KRSN-content">
            <a class="KRSN-title" href="${KRSN_escape(item.url)}">
              ${KRSN_escape(item.title)}
            </a>

            <div class="KRSN-meta">
              <span class="KRSN-forum">#${KRSN_escape(item.forum)}</span>
              <span class="KRSN-last">${KRSN_escape(item.last)}</span>
              ${item.stats ? `<span class="KRSN-last">${KRSN_escape(item.stats)}</span>` : ""}
            </div>
          </div>
        </li>
      `);
    });
  }

  function KRSN_extractTopicsFromSearch(html) {
    const topics = [];
    const seen = {};

    const regex = /<a[^>]+href="([^"]*\/t[0-9][^"]*)"[^>]*>(.*?)<\/a>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      const rawTitle = match[2];

      const title = KRSN_clean(rawTitle.replace(/<[^>]*>/g, ""));
      const url = KRSN_url(href);
      const id = (href.match(/\/t[0-9]+/i) || [url])[0];

      if (!title || title.length < 3 || seen[id]) continue;

      seen[id] = true;

      topics.push({
        title: title,
        url: url,
        avatar: KRSN_DEFAULT_AVATAR,
        forum: "Sujet récent",
        last: "Dernière activité",
        stats: ""
      });

      if (topics.length >= 10) break;
    }

    return topics;
  }

 function KRSN_enrichOneTopic(topic, index, topics) {
  $.ajax({
    url: topic.url,
    method: "GET",
    cache: false,
    success: function (html) {
      const lastNameMatch = html.match(/<div class="lithium-vb_postname"[^>]*>([\s\S]*?)<\/div>/gi);
      const avatarMatch = html.match(/<div class="lithium-vb_posteravatar"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/gi);
      const dateMatch = html.match(/<div class="ls-vb_topicre"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/gi);

      let lastUser = "Inconnu";
      let avatar = KRSN_DEFAULT_AVATAR;
      let date = "";

      if (lastNameMatch && lastNameMatch.length) {
        lastUser = KRSN_clean(
          lastNameMatch[lastNameMatch.length - 1].replace(/<[^>]*>/g, "")
        );
      }

      if (avatarMatch && avatarMatch.length) {
        const src = avatarMatch[avatarMatch.length - 1].match(/src="([^"]+)"/i);
        if (src && src[1]) avatar = src[1];
      }

      if (dateMatch && dateMatch.length) {
        date = KRSN_clean(
          dateMatch[dateMatch.length - 1].replace(/<[^>]*>/g, "")
        );
      }

      topics[index].avatar = KRSN_url(avatar);
      topics[index].last = "Dernière réponse par " + lastUser;
      topics[index].stats = date;

      KRSN_render(topics);
    }
  });
}

  function KRSN_enrichTopics(topics) {
    topics.forEach(function (topic, index) {
      setTimeout(function () {
        KRSN_enrichOneTopic(topic, index, topics);
      }, index * 250);
    });
  }

  function KRSN_loadTopics() {
    KRSN_buildPanel();

    const list = $("#KRSN-list");

    list.html("<li class='KRSN-empty'>Chargement des sujets récents...</li>");

    $.ajax({
      url: "/search?search_id=latest",
      method: "GET",
      cache: false,
      success: function (html) {
        const topics = KRSN_extractTopicsFromSearch(html);

        if (!topics.length) {
          list.html("<li class='KRSN-empty'>Aucun sujet récent trouvé.</li>");
          $("#KRSN-count").text("");
          return;
        }

        KRSN_render(topics);
        KRSN_enrichTopics(topics);
      },
      error: function () {
        list.html(
          "<li class='KRSN-empty'>Impossible de charger les sujets récents.</li>"
        );
      }
    });
  }

  function KRSN_open() {
    KRSN_buildPanel();

    $("#fa-pins-panel").removeClass("open");
    $("#KRSN-panel").addClass("open");

    KRSN_loadTopics();
    KRSN_syncSidebar();

    if (window.lucide) lucide.createIcons();
  }

  function KRSN_close() {
    $("#KRSN-panel").removeClass("open");
    KRSN_syncSidebar();
  }

  function KRSN_toggle() {
    if ($("#KRSN-panel").hasClass("open")) {
      KRSN_close();
    } else {
      KRSN_open();
    }
  }

  $(document)
    .off("click.KRSN", "#KRSN-button")
    .on("click.KRSN", "#KRSN-button", function (e) {
      e.preventDefault();
      KRSN_toggle();
    });

  $(document)
    .off("click.KRSN", "#KRSN-close")
    .on("click.KRSN", "#KRSN-close", function (e) {
      e.preventDefault();
      KRSN_close();
    });

  $(document)
    .off("keyup.KRSN")
    .on("keyup.KRSN", function (e) {
      if (e.key === "Escape") KRSN_close();
    });

  KRSN_buildPanel();
  KRSN_loadTopics();
  KRSN_syncSidebar();

  if (window.lucide) lucide.createIcons();
});
