$(function () {
  const VRSL_DEFAULT_AVATAR = "https://zupimages.net/up/26/20/z3y2.jpg";

  const VRSL_STORAGE_KEY = "VRSL_last_seen_post";
  const VRSL_CHECK_DELAY = 15000;
  const VRSL_TOAST_DURATION = 10000;

  /*
    Remplace cette URL par ton propre petit son si tu veux.
    Tu peux mettre une URL .mp3, .ogg ou .wav.
  */
  const VRSL_SOUND_URL = "";
  let VRSL_SOUND = null;

  if (VRSL_SOUND_URL) {
    VRSL_SOUND = new Audio(VRSL_SOUND_URL);
    VRSL_SOUND.volume = 0.25;
  }

  function VRSL_clean(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function VRSL_url(url) {
    if (!url) return "";
    if (url.startsWith("//")) return location.protocol + url;
    if (url.startsWith("/")) return location.origin + url;
    return url;
  }

  function VRSL_escape(text) {
    return $("<div>").text(text || "").html();
  }

  function VRSL_buildWrap() {
    if ($("#VRSL-toast-wrap").length) return;
    $("body").append(`<div id="VRSL-toast-wrap"></div>`);
  }

  function VRSL_playSound() {
    if (!VRSL_SOUND) return;

    try {
      VRSL_SOUND.currentTime = 0;
      VRSL_SOUND.play().catch(function () {});
    } catch (e) {}
  }

  function VRSL_extractLatestFromSearch(html) {
    const regex = /<a[^>]+href="([^"]*\/t[0-9][^"]*)"[^>]*>(.*?)<\/a>/gi;
    const seen = {};
    let match;

    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      const rawTitle = match[2];

      const title = VRSL_clean(rawTitle.replace(/<[^>]*>/g, ""));
      const url = VRSL_url(href);
      const postId = href;

      const topicIdMatch = href.match(/\/t[0-9]+/i);
      const topicId = topicIdMatch ? topicIdMatch[0] : href;

      if (!title || title.length < 3 || seen[topicId]) continue;

      seen[topicId] = true;

      return {
        id: postId,
        title: title,
        url: url,
        avatar: VRSL_DEFAULT_AVATAR,
        author: "Quelqu'un",
        date: ""
      };
    }

    return null;
  }

  function VRSL_enrichTopic(topic, callback) {
    $.ajax({
      url: topic.url,
      method: "GET",
      cache: false,
      success: function (html) {
        const names = html.match(
          /<div class="lithium-vb_postname"[^>]*>([\s\S]*?)<\/div>/gi
        );

        const avatars = html.match(
          /<div class="lithium-vb_posteravatar"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/gi
        );

        const dates = html.match(
          /<div class="ls-vb_topicre"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/gi
        );

        if (names && names.length) {
          topic.author = VRSL_clean(
            names[names.length - 1].replace(/<[^>]*>/g, "")
          );
        }

        if (avatars && avatars.length) {
          const src = avatars[avatars.length - 1].match(/src="([^"]+)"/i);
          if (src && src[1]) {
            topic.avatar = VRSL_url(src[1]);
          }
        }

        if (dates && dates.length) {
          topic.date = VRSL_clean(
            dates[dates.length - 1].replace(/<[^>]*>/g, "")
          );
        }

        callback(topic);
      },
      error: function () {
        callback(topic);
      }
    });
  }

  function VRSL_showToast(topic) {
    VRSL_buildWrap();

    const toast = $(`
      <div class="VRSL-toast" role="button" tabindex="0">
        <img class="VRSL-avatar" src="${VRSL_escape(topic.avatar || VRSL_DEFAULT_AVATAR)}" alt="">

        <div class="VRSL-content">
          <div class="VRSL-line">
            <span class="VRSL-author">${VRSL_escape(topic.author || "Quelqu'un")}</span>
            a écrit dans
          </div>

          <div class="VRSL-title">${VRSL_escape(topic.title)}</div>

          <div class="VRSL-meta">
            ${topic.date ? `<span class="VRSL-pill">${VRSL_escape(topic.date)}</span>` : ""}
          </div>
        </div>
      </div>
    `);

    toast.on("click keypress", function (e) {
      if (e.type === "click" || e.key === "Enter") {
        window.location.href = topic.url;
      }
    });

    $("#VRSL-toast-wrap").append(toast);

    VRSL_playSound();

    setTimeout(function () {
      toast.addClass("VRSL-out");

      setTimeout(function () {
        toast.remove();
      }, 300);
    }, VRSL_TOAST_DURATION);
  }

  function VRSL_checkLatest() {
    $.ajax({
      url: "/search?search_id=latest",
      method: "GET",
      cache: false,
      success: function (html) {
        const topic = VRSL_extractLatestFromSearch(html);

        if (!topic || !topic.id) return;

        const lastSeen = localStorage.getItem(VRSL_STORAGE_KEY);

        if (!lastSeen) {
          localStorage.setItem(VRSL_STORAGE_KEY, topic.id);
          return;
        }

        if (lastSeen !== topic.id) {
          localStorage.setItem(VRSL_STORAGE_KEY, topic.id);

          VRSL_enrichTopic(topic, function (enrichedTopic) {
            VRSL_showToast(enrichedTopic);
          });
        }
      }
    });
  }

  VRSL_buildWrap();

  setTimeout(VRSL_checkLatest, 2000);
  setInterval(VRSL_checkLatest, VRSL_CHECK_DELAY);
});
