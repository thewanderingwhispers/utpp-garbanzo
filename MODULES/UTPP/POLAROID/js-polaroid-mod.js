(function () {
  const PLRD = {
        icon: `
      <svg xmlns="http://www.w3.org/2000/svg"
           width="14"
           height="14"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="2"
           stroke-linecap="round"
           stroke-linejoin="round"
           class="lucide lucide-mail"
		   style="margin-right: 6px;">
        <rect x="2" y="4" width="20" height="16" rx="2"></rect>
        <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path>
      </svg>
    `.trim(),
    quickIcon: "✉",
    title: "PLRD",
    maxMessages: 50
  };

  function waitBody(fn) {
    if (!document.body) return setTimeout(() => waitBody(fn), 100);
    fn();
  }

  function escapeHTML(str) {
    return String(str || "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
  }

  function getUserIdFromUrl(url) {
    return (url || "").match(/\/u(\d+)/)?.[1] || null;
  }

  function normalizeSubject(subject) {
    return String(subject || "")
      .replace(/^(re\s*:\s*)+/i, "")
      .trim()
      .toLowerCase();
  }

  function cleanSubject(subject) {
    return String(subject || "")
      .replace(/^(re\s*:\s*)+/i, "")
      .trim();
  }

  function getMe() {
    return window._userdata?.username || "";
  }

  function getContactName(mp) {
    const me = getMe();

    if (mp.author && mp.author !== me) return mp.author;
    if (mp.recipient && mp.recipient !== me) return mp.recipient;

    return mp.author || mp.recipient || "Inconnu";
  }

  function getContactId(mp) {
    const me = getMe();

    if (mp.author && mp.author !== me) return mp.authorId;
    if (mp.recipient && mp.recipient !== me) return mp.recipientId;

    return mp.authorId || mp.recipientId || "";
  }

  function groupMessagesBySubject(messages) {
    const groups = {};

    messages.forEach(mp => {
      const key = normalizeSubject(mp.subject);

      if (!groups[key]) {
        groups[key] = {
          subject: cleanSubject(mp.subject),
          messages: []
        };
      }

      groups[key].messages.push(mp);
    });

    return Object.values(groups);
  }

  async function buildContacts(groups) {
    const contacts = {};

    for (const group of groups) {
      const fullMessages = await Promise.all(
        [...group.messages]
          .reverse()
          .map(async mp => ({
            ...mp,
            ...(await readMP(mp.url))
          }))
      );

      const contactName = getContactName(fullMessages[0]);
      const contactId = getContactId(fullMessages[0]);
      const avatar = fullMessages[0].authorAvatar || await getAvatar(contactId);

      if (!contacts[contactName]) {
        contacts[contactName] = {
          username: contactName,
          userId: contactId,
          avatar,
          conversations: []
        };
      }

      contacts[contactName].conversations.push({
        subject: group.subject,
        messages: fullMessages
      });
    }

    return Object.values(contacts);
  }

  async function getAvatar(userId) {
    if (!userId) return "";

    try {
      const html = await fetch(`/u${userId}`, {
        credentials: "same-origin"
      }).then(r => r.text());

      const doc = new DOMParser().parseFromString(html, "text/html");

      return (
        doc.querySelector("#profile-advanced-right img")?.src ||
        doc.querySelector(".postprofile-avatar img")?.src ||
        ""
      );
    } catch {
      return "";
    }
  }

  async function loadInbox() {
    const html = await fetch("/privmsg?folder=inbox", {
      credentials: "same-origin"
    }).then(r => r.text());

    const doc = new DOMParser().parseFromString(html, "text/html");

    return [...doc.querySelectorAll('a[href*="mode=read"][href*="p="]')]
      .map(a => ({
        subject: a.textContent.trim(),
        url: a.getAttribute("href"),
        id: a.getAttribute("href")?.match(/p=(\d+)/)?.[1] || ""
      }))
      .filter(m => m.subject && m.url)
      .slice(0, PLRD.maxMessages);
  }

  async function readMP(url) {
    const html = await fetch(url, {
      credentials: "same-origin"
    }).then(r => r.text());

    const doc = new DOMParser().parseFromString(html, "text/html");
    const post = doc.querySelector(".postbody");
    const profile = doc.querySelector(".postprofile");

    const profileName = profile?.querySelector(".postprofile-name")?.textContent.trim() || "";
    const profileAvatar = profile?.querySelector(".postprofile-avatar img")?.src || "";
    const profileUrl = profile?.querySelector('.postprofile-contact a[href^="/u"]')?.getAttribute("href") || "";
    const profileId = getUserIdFromUrl(profileUrl);

    return {
      subject: post?.querySelector(".h3")?.textContent.trim() || "Sans sujet",
      author: profileName || post?.querySelector(".author span:nth-of-type(1)")?.textContent.trim() || "",
      recipient: post?.querySelector(".author span:nth-of-type(2)")?.textContent.trim() || "",
      authorId: profileId,
      recipientId: "",
      authorAvatar: profileAvatar,
      content: post?.querySelector(".content")?.textContent.trim() || "Message introuvable.",
      quoteUrl: post?.querySelector('a[href*="mode=quote"]')?.getAttribute("href") || ""
    };
  }

  async function sendMP(formUrl, subject, message) {
    const html = await fetch(formUrl, {
      credentials: "same-origin"
    }).then(r => r.text());

    const doc = new DOMParser().parseFromString(html, "text/html");
    const form = doc.querySelector('form[action*="privmsg"]');

    if (!form) throw new Error("Formulaire MP introuvable.");

    const formData = new FormData(form);
    formData.set("subject", subject);
    formData.set("message", message);
    formData.set("post", "Envoyer");

    const action = form.getAttribute("action") || "/privmsg";

    const sent = await fetch(action, {
      method: "POST",
      credentials: "same-origin",
      body: formData
    });

    if (!sent.ok) throw new Error("Erreur pendant l’envoi.");
  }

  async function openPLRD(target = null) {
    document.querySelector("#plrdWin")?.remove();

    const win = document.createElement("div");
    win.id = "plrdWin";

    win.innerHTML = `
      <div class="plrd-head">
        <strong>${PLRD.icon} ${PLRD.title}</strong>
        <button class="plrd-btnClose" type="button">×</button>
      </div>

      <div class="plrd-grid">
        <div class="plrd-side">Chargement...</div>

        <div class="plrd-main">
          <div class="plrd-stateEmpty">Sélectionne une conversation ou écris un nouveau message.</div>
        </div>
      </div>
    `;

    document.body.appendChild(win);

    const sidebar = win.querySelector(".plrd-side");
    const panel = win.querySelector(".plrd-main");

    win.querySelector(".plrd-btnClose").onclick = () => win.remove();

    function renderCompose(user) {
      panel.innerHTML = `
        <div class="plrd-compose">
          <div class="plrd-user">
            ${
              user.avatar
                ? `<img src="${escapeHTML(user.avatar)}" alt="">`
                : `<div class="plrd-avatarEmpty">?</div>`
            }

            <div>
              <strong>${escapeHTML(user.username)}</strong>
              <span>Nouveau message</span>
            </div>
          </div>

          <label>Sujet</label>
          <input class="plrd-fieldSubject" type="text" placeholder="Objet du message..." maxlength="255">

          <label>Message</label>
          <textarea class="plrd-fieldMsg" placeholder="Écris ton message..."></textarea>

          <button class="plrd-btnSend" type="button">Envoyer</button>
          <div class="plrd-stateStatus"></div>
        </div>
      `;

      const subject = panel.querySelector(".plrd-fieldSubject");
      const message = panel.querySelector(".plrd-fieldMsg");
      const send = panel.querySelector(".plrd-btnSend");
      const status = panel.querySelector(".plrd-stateStatus");

      subject.focus();

      send.onclick = async () => {
        if (!subject.value.trim()) {
          status.textContent = "Merci d’indiquer un sujet.";
          subject.focus();
          return;
        }

        if (!message.value.trim()) {
          status.textContent = "Message vide.";
          message.focus();
          return;
        }

        send.disabled = true;
        send.textContent = "Envoi...";
        status.textContent = "Envoi en cours...";

        try {
          await sendMP(
            `/privmsg?mode=post&u=${user.userId}`,
            subject.value.trim(),
            message.value.trim()
          );

          status.textContent = "MP envoyé ✨";
          subject.value = "";
          message.value = "";
          subject.focus();
        } catch (e) {
          status.textContent = e.message;
        } finally {
          send.disabled = false;
          send.textContent = "Envoyer";
        }
      };
    }

    function renderThread(group, messages) {
      const latest = messages[messages.length - 1];

      panel.innerHTML = `
        <div class="plrd-viewRead plrd-thread">
          <div class="plrd-threadHead">
            <h3>${escapeHTML(group.subject)}</h3>
            <button class="plrd-btnThreadClose" type="button" title="Quitter cette conversation">×</button>
          </div>

          <div class="plrd-threadList">
            ${messages.map((data, index) => `
              <article class="plrd-msgCard">
                <div class="plrd-meta">
                  <strong>De :</strong> ${escapeHTML(data.author)}<br>
                  <strong>À :</strong> ${escapeHTML(data.recipient)}
                </div>

                <div class="plrd-content">${escapeHTML(data.content)}</div>
              </article>

              ${
                index < messages.length - 1
                  ? `<div class="plrd-sep"></div>`
                  : ""
              }
            `).join("")}
          </div>

          <div class="plrd-reply">
            <h4>Répondre</h4>

            <label>Sujet</label>
            <input
              class="plrd-fieldSubject"
              type="text"
              value="Re: ${escapeHTML(group.subject)}"
              maxlength="255"
            >

            <label>Message</label>
            <textarea class="plrd-fieldMsg" placeholder="Écris ta réponse..."></textarea>

            <button class="plrd-btnSend" type="button">Envoyer</button>
            <div class="plrd-stateStatus"></div>
          </div>
        </div>
      `;

      const subject = panel.querySelector(".plrd-fieldSubject");
      const message = panel.querySelector(".plrd-fieldMsg");
      const send = panel.querySelector(".plrd-btnSend");
      const status = panel.querySelector(".plrd-stateStatus");
      const closeThread = panel.querySelector(".plrd-btnThreadClose");

      closeThread.onclick = () => {
        win.querySelectorAll(".plrd-topicSide").forEach(b => {
          b.classList.remove("is-active");
        });

        if (target) {
          renderCompose(target);
        } else {
          panel.innerHTML = `
            <div class="plrd-stateEmpty">
              Sélectionne une conversation ou clique sur un pseudo pour écrire un nouveau message.
            </div>
          `;
        }
      };

      message.focus();

      send.onclick = async () => {
        if (!subject.value.trim()) {
          status.textContent = "Merci d’indiquer un sujet.";
          subject.focus();
          return;
        }

        if (!message.value.trim()) {
          status.textContent = "Message vide.";
          message.focus();
          return;
        }

        if (!latest.quoteUrl) {
          status.textContent = "Lien de réponse introuvable.";
          return;
        }

        send.disabled = true;
        send.textContent = "Envoi...";
        status.textContent = "Envoi en cours...";

        try {
          await sendMP(
            latest.quoteUrl,
            subject.value.trim(),
            message.value.trim()
          );

          status.textContent = "Réponse envoyée ✨";
          message.value = "";
          message.focus();
        } catch (e) {
          status.textContent = e.message;
        } finally {
          send.disabled = false;
          send.textContent = "Envoyer";
        }
      };
    }

    try {
      const inbox = await loadInbox();
      const groupedInbox = groupMessagesBySubject(inbox);
      const contacts = await buildContacts(groupedInbox);

      sidebar.innerHTML = contacts.length
        ? contacts.map((contact, index) => `
            <div class="plrd-contactBlock" data-contact-index="${index}">
              <button
                class="plrd-contactToggle"
                type="button"
                data-contact-toggle="${index}"
              >
                ${
                  contact.avatar
                    ? `<img class="plrd-avatarSide" src="${escapeHTML(contact.avatar)}" alt="">`
                    : `<span class="plrd-avatarSide plrd-avatarSideEmpty">?</span>`
                }

                <span class="plrd-contactInfo">
                  <strong>${escapeHTML(contact.username)}</strong>
                  <span class="plrd-count">
                    ${contact.conversations.length} conversation${contact.conversations.length > 1 ? "s" : ""}
                  </span>
                </span>
              </button>

              <div class="plrd-topicList">
                ${contact.conversations.map((conv, convIndex) => `
                  <button
                    class="plrd-topicSide"
                    type="button"
                    data-contact-index="${index}"
                    data-topic-index="${convIndex}"
                  >
                    <span>— ${escapeHTML(conv.subject)}</span>
                    ${
                      conv.messages.length > 1
                        ? `<span class="plrd-count">(${conv.messages.length})</span>`
                        : ""
                    }
                  </button>
                `).join("")}
              </div>
            </div>
          `).join("")
        : `<div class="plrd-stateNoConv">Aucun MP</div>`;

      win.querySelectorAll("[data-contact-toggle]").forEach(btn => {
        btn.onclick = () => {
          const block = btn.closest(".plrd-contactBlock");
          if (!block) return;

          const isOpen = block.classList.contains("is-open");

          win.querySelectorAll(".plrd-contactBlock").forEach(other => {
            if (other !== block) other.classList.remove("is-open");
          });

          block.classList.toggle("is-open", !isOpen);
        };
      });

      win.querySelectorAll(".plrd-topicSide").forEach(topicBtn => {
        topicBtn.onclick = () => {
          win.querySelectorAll(".plrd-topicSide").forEach(b => {
            b.classList.remove("is-active");
          });

          topicBtn.classList.add("is-active");

          const contact = contacts[Number(topicBtn.dataset.contactIndex)];
          const conv = contact.conversations[Number(topicBtn.dataset.topicIndex)];

          renderThread(conv, conv.messages);
        };
      });

      if (target) {
        target.avatar = await getAvatar(target.userId);
        renderCompose(target);
      }
    } catch {
      sidebar.innerHTML = `<div class="plrd-stateError">Erreur de chargement.</div>`;
    }
  }

  function addPseudoButtons() {
    document.querySelectorAll('a[href^="/u"]').forEach(link => {
      if (link.dataset.plrdReady) return;

      const href = link.getAttribute("href") || "";
      const username = link.textContent.trim();
      const userId = getUserIdFromUrl(href);

      if (!userId || !username) return;

      if (
        link.closest(
          "#tabs, .tabs, .profile-tabs, .profile-icons, .navbar, #page-header, #profile-advanced-layout"
        )
      ) return;

      link.dataset.plrdReady = "1";

      const btn = document.createElement("button");
      btn.className = "plrd-btnMin";
      btn.type = "button";
      btn.textContent = PLRD.quickIcon;
      btn.title = `Envoyer un MP à ${username}`;

      btn.onclick = e => {
        e.preventDefault();
        e.stopPropagation();

        openPLRD({
          username,
          userId,
          avatar: ""
        });
      };

      link.insertAdjacentElement("afterend", btn);
    });
  }

  waitBody(() => {
    addPseudoButtons();
  });
})();
