(function () {
  const FRQCY = {
    refreshRate: 1500,
    typingTTL: 4500,
    typingThrottle: 3500,

    defaultChannel: "general",

    channels: {
      general: { label: "general", name: "#general", access: "public" },
      rp: { label: "rp", name: "#rp", access: "public" },
      flood: { label: "flood", name: "#flood", access: "public" },
      annonces: { label: "annonces", name: "#annonces", access: "public", write: "staff" },
      staff: { label: "staff", name: "#staff", access: "staff" }
    },

    staff: {
  		admins: ["bad omen", "Morgan Quill"],
  		moderators: []
	},

    selectors: {
      frame: "#frame_chatbox",
      chatbox: "#chatbox",
      members: "#chatbox_members",
      input: "#message",
      submit: "#submit"
    },

    state: {
      currentUser: "",
      currentUserId: "",
      currentChannel: "general",

      syncTimer: null,

      knownMessageIds: new Set(),
      messageMap: {},

      replyTarget: null,
      replyCacheKey: "FRQCY_REPLY_CACHE_v1",
      replyCache: {},

      typingUsers: {},
      lastTypingSent: 0,

      unreadCount: 0,
      hasUnreadMention: false,
      channelUnread: {},
      channelMentions: {},

      initialized: false,
      membersByName: {},
      avatarCache: {},
      colorByName: {},
      mentionNames: new Set()
    }
  };

  function detectCurrentUser() {
    const data = window._userdata || {};

    if (data.username) FRQCY.state.currentUser = String(data.username).trim();
    if (data.user_id) FRQCY.state.currentUserId = String(data.user_id).trim();

    if (FRQCY.state.currentUser) registerMentionName(FRQCY.state.currentUser);
  }

  function getRole(name) {
    const clean = normalizeName(name);

    if (FRQCY.staff.admins.map(normalizeName).includes(clean)) return "admin";
    if (FRQCY.staff.moderators.map(normalizeName).includes(clean)) return "moderator";

    return "";
  }

  function isStaff(name = FRQCY.state.currentUser) {
    const role = getRole(name);
    return role === "admin" || role === "moderator";
  }

  function canAccessChannel(channelId) {
    const channel = FRQCY.channels[channelId];
    if (!channel) return false;

    if (channel.access === "staff") return isStaff();
    return true;
  }

  function canWriteChannel(channelId) {
    const channel = FRQCY.channels[channelId];
    if (!channel) return false;

    if (channel.write === "staff") return isStaff();
    return canAccessChannel(channelId);
  }

  function getAccessibleChannels() {
    return Object.entries(FRQCY.channels)
      .filter(([id]) => canAccessChannel(id))
      .map(([id, channel]) => ({ id, ...channel }));
  }

  function getRoleIcon(role) {
    if (role === "admin") {
      return `<svg class="frqcy-role-icon frqcy-role-admin" viewBox="0 0 24 24" aria-label="Admin"><path d="M12 2l2.9 6.26L22 9.27l-5.2 4.95L18.1 21 12 17.62 5.9 21l1.3-6.78L2 9.27l7.1-1.01L12 2z"></path></svg>`;
    }

    if (role === "moderator") {
      return `<svg class="frqcy-role-icon frqcy-role-moderator" viewBox="0 0 24 24" aria-label="Modérateur"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
    }

    return "";
  }

  function ensureChatboxFrame() {
    let frame = document.querySelector(FRQCY.selectors.frame);

    if (!frame) {
      document.body.insertAdjacentHTML("beforeend", `
        <object id="frame_chatbox" data="/chatbox/?page=front&" type="text/html"></object>
      `);

      frame = document.querySelector(FRQCY.selectors.frame);
    }

    return frame;
  }

  function getChatboxDoc() {
    const frame = ensureChatboxFrame();
    return frame?.contentDocument || null;
  }

function createInterface() {
  if (document.querySelector("#frqcy-root")) return;

  document.body.insertAdjacentHTML("beforeend", `
  <section id="frqcy-root" class="frqcy-closed" aria-hidden="true">
      <header id="frqcy-header">
        <div>
          <strong>HOLD MY FREQUENCY</strong>
          <span id="frqcy-status">ON AIR — 0 tuned in</span>
        </div>
        <button id="frqcy-close" type="button">×</button>
      </header>

      <nav id="frqcy-channels"></nav>

      <div id="frqcy-body">
        <aside id="frqcy-members">
          <div class="frqcy-panel-title">ON AIR</div>
          <ul id="frqcy-member-list"></ul>
          <div id="frqcy-typing"></div>
        </aside>

        <main id="frqcy-messages"></main>
      </div>

      <div id="frqcy-reply-preview" hidden></div>

      <form id="frqcy-form">
        <input id="frqcy-input" type="text" placeholder="Écrire sur la fréquence..." autocomplete="off">
        <button type="submit">➤</button>
      </form>
    </section>
  `);

  const toggleButton = document.querySelector("#frqcy-toggle");
  const closeButton = document.querySelector("#frqcy-close");
  const form = document.querySelector("#frqcy-form");
  const input = document.querySelector("#frqcy-input");

  if (toggleButton) {
    toggleButton.addEventListener("click", toggleFrequency);
  }

  if (closeButton) {
    closeButton.addEventListener("click", closeFrequency);
  }

  if (form) {
    form.addEventListener("submit", sendMessage);
  }

  if (input) {
    input.addEventListener("input", handleTypingInput);
    input.addEventListener("keydown", handleTypingKeydown);
  }

  document.addEventListener("click", event => {
    const channelButton = event.target.closest("[data-frqcy-channel]");
    if (channelButton) {
      switchChannel(channelButton.dataset.frqcyChannel);
      return;
    }

    const mentionButton = event.target.closest("[data-mention]");
    if (mentionButton) {
      mentionUser(mentionButton.dataset.mention);
      return;
    }

    const replyButton = event.target.closest("[data-reply-mid]");
    if (replyButton) {
      selectReply(replyButton.dataset.replyMid);
      return;
    }

    const cancelReply = event.target.closest("[data-frqcy-cancel-reply]");
    if (cancelReply) {
      clearReply();
      return;
    }

    const replyJump = event.target.closest("[data-reply-jump]");
    if (replyJump) {
      jumpToMessage(replyJump.dataset.replyJump);
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeFrequency();
    }
  });

renderChannels();

if (toggleButton) {
  toggleButton.classList.remove("is-active");
  toggleButton.setAttribute("aria-expanded", "false");
}

if (window.lucide && typeof window.lucide.createIcons === "function") {
  window.lucide.createIcons();
}

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}
	function toggleFrequency() {
  if (isFrequencyOpen()) {
    closeFrequency();
  } else {
    openFrequency();
  }
}

function openFrequency() {
  const root = document.querySelector("#frqcy-root");
  const toggle = document.querySelector("#frqcy-toggle");

  if (!root) return;

  root.classList.remove("frqcy-closed");
  root.setAttribute("aria-hidden", "false");

  if (toggle) {
    toggle.classList.add("is-active");
    toggle.setAttribute("aria-expanded", "true");
  }

  const channel = FRQCY.state.currentChannel;

  FRQCY.state.channelUnread[channel] = 0;
  FRQCY.state.channelMentions[channel] = false;

  FRQCY.state.unreadCount = Object.values(FRQCY.state.channelUnread)
    .reduce((sum, count) => sum + Number(count || 0), 0);

  FRQCY.state.hasUnreadMention = Object.values(FRQCY.state.channelMentions)
    .some(Boolean);

  updateBadge();
  syncFrequency(true);
  refocusInput(50);
}

function closeFrequency() {
  const root = document.querySelector("#frqcy-root");
  const toggle = document.querySelector("#frqcy-toggle");

  if (!root) return;

  root.classList.add("frqcy-closed");
  root.setAttribute("aria-hidden", "true");

  if (toggle) {
    toggle.classList.remove("is-active");
    toggle.setAttribute("aria-expanded", "false");
  }
}

function isFrequencyOpen() {
  const root = document.querySelector("#frqcy-root");
  return !!root && !root.classList.contains("frqcy-closed");
}

  function switchChannel(channelId) {
    if (!canAccessChannel(channelId)) return;

    FRQCY.state.currentChannel = channelId;
    FRQCY.state.channelUnread[channelId] = 0;
    FRQCY.state.channelMentions[channelId] = false;

    clearReply();
    renderChannels();
    updateInputState();
    updateBadge();
    syncFrequency(true);
    refocusInput(50);
  }

  function renderChannels() {
    const target = document.querySelector("#frqcy-channels");
    if (!target) return;

    const channels = getAccessibleChannels();

    target.innerHTML = channels.map(channel => {
      const unread = FRQCY.state.channelUnread[channel.id] || 0;
      const hasMention = !!FRQCY.state.channelMentions[channel.id];
      const active = channel.id === FRQCY.state.currentChannel;

      return `
        <button
          type="button"
          class="frqcy-channel ${active ? "frqcy-channel-active" : ""} ${hasMention ? "frqcy-channel-mention" : ""}"
          data-frqcy-channel="${escapeHTML(channel.id)}"
        >
          <span>${escapeHTML(channel.name)}</span>
          ${unread ? `<em>${unread}</em>` : ""}
        </button>
      `;
    }).join("");
  }

  function syncFrequency(forceScroll = false) {
    const inputWasFocused = document.activeElement?.id === "frqcy-input";

    detectCurrentUser();

    if (!canAccessChannel(FRQCY.state.currentChannel)) {
      FRQCY.state.currentChannel = FRQCY.defaultChannel;
    }

    readMembers();
    readMessages(forceScroll);
    updateTypingIndicator();
    updateConnectionState();
    renderChannels();
    updateInputState();

    if (inputWasFocused) {
      refocusInput(0);
    }
  }

  function updateInputState() {
    const input = document.querySelector("#frqcy-input");
    const form = document.querySelector("#frqcy-form");

    if (!input || !form) return;

    const canWrite = canWriteChannel(FRQCY.state.currentChannel);
    const disconnected = form.classList.contains("frqcy-disabled");

    input.readOnly = !canWrite || disconnected;

    input.placeholder = canWrite
      ? `Écrire sur ${FRQCY.channels[FRQCY.state.currentChannel]?.name || "#general"}...`
      : "Lecture seule sur cette fréquence.";

    if (disconnected) {
      input.placeholder = "Connexion requise pour rejoindre la fréquence.";
    }
  }

  function updateConnectionState() {
    const cb = getChatboxDoc();
    const form = document.querySelector("#frqcy-form");
    const input = document.querySelector("#frqcy-input");
    const messages = document.querySelector("#frqcy-messages");

    if (!cb || !form || !input || !messages) return;

    const text = cb.body.innerText || "";
    const disconnected = /Vous êtes déconnecté|Rejoindre le Chat/i.test(text);

    form.classList.toggle("frqcy-disabled", disconnected);

    let notice = document.querySelector("#frqcy-connect");

    if (disconnected) {
      input.readOnly = true;

      if (!notice) {
        messages.insertAdjacentHTML("afterbegin", `
          <div id="frqcy-connect" class="frqcy-connect">
            <strong>Fréquence inactive</strong>
            <span>Connecte-toi pour rejoindre le direct.</span>
            <button type="button">Se connecter à la fréquence</button>
          </div>
        `);

        document.querySelector("#frqcy-connect button").addEventListener("click", joinChatbox);
      }
    } else if (notice) {
      notice.remove();
      form.classList.remove("frqcy-disabled");
    }

    updateInputState();
  }

  function joinChatbox() {
    const cb = getChatboxDoc();
    if (!cb) return;

    const possibleLinks = Array.from(cb.querySelectorAll("a, button, span"))
      .filter(el => /Connexion|Rejoindre le Chat|Rejoindre/i.test(el.textContent || ""));

    const loginTarget =
      cb.querySelector("#chatbox_option_co a") ||
      cb.querySelector("#chatbox_option_co") ||
      possibleLinks[0];

    if (loginTarget) {
      loginTarget.click();
      setTimeout(() => syncFrequency(true), 800);
      setTimeout(() => syncFrequency(true), 1600);
    }
  }

  function readMembers() {
    const cb = getChatboxDoc();
    if (!cb) return;

    const nativeMembers = cb.querySelector(FRQCY.selectors.members);
    const list = document.querySelector("#frqcy-member-list");
    const status = document.querySelector("#frqcy-status");

    if (!nativeMembers || !list || !status) return;

    const members = Array.from(nativeMembers.querySelectorAll(".chatbox-user-username"))
      .map(el => ({
        name: el.textContent.trim(),
        userId: el.dataset.user || "",
        color: getNativeColor(el)
      }))
      .filter(member => member.name);

    members.forEach(member => {
      registerMentionName(member.name);
      FRQCY.state.membersByName[normalizeName(member.name)] = member;

      if (member.color) FRQCY.state.colorByName[normalizeName(member.name)] = member.color;
      if (member.userId && !FRQCY.state.avatarCache[member.userId]) {
        loadAvatar(member.userId, member.name);
      }
    });

    list.innerHTML = members.map(member => renderMember(member)).join("");
    status.textContent = `ON AIR — ${members.length} tuned in`;
  }

  function renderMember(member) {
    const avatar = member.userId ? FRQCY.state.avatarCache[member.userId] : "";
    const role = getRole(member.name);
    const color = member.color || FRQCY.state.colorByName[normalizeName(member.name)] || "";

    return `
      <li class="frqcy-member frqcy-role-${role || "member"}" data-user="${escapeHTML(member.userId)}">
        ${renderAvatar(member.name, avatar, "frqcy-member-avatar")}
        <button type="button" class="frqcy-member-name" data-mention="${escapeHTML(member.name)}">
          <span class="frqcy-name" ${color ? `style="color:${escapeHTML(color)}"` : ""}>
            ${getRoleIcon(role)}
            <span>${escapeHTML(member.name)}</span>
          </span>
        </button>
      </li>
    `;
  }

  function readMessages(forceScroll = false) {
    const cb = getChatboxDoc();
    if (!cb) return;

    const nativeChatbox = cb.querySelector(FRQCY.selectors.chatbox);
    const target = document.querySelector("#frqcy-messages");

    if (!nativeChatbox || !target) return;

    const wasNearBottom = isNearBottom(target);
    const rows = Array.from(nativeChatbox.querySelectorAll("p[class*='chatbox_row']"));

    const parsedRows = rows.map(row => {
      const parsed = parseMessageRow(row);
      const mid = getMessageId(row, parsed);
      const control = parseControlPayload(parsed.message);
      const channelPayload = parseChannelPayload(parsed.message);

      return {
        row,
        parsed,
        mid,
        control,
        channel: channelPayload.channel,
        channelBody: channelPayload.body
      };
    });

    parsedRows.forEach(item => {
      if (item.control?.type === "typing") rememberTyping(item.control);
    });

    const visibleRows = parsedRows
      .filter(item => !item.control)
      .filter(item => canAccessChannel(item.channel));

    const currentRows = visibleRows
      .filter(item => item.channel === FRQCY.state.currentChannel);

    const newRows = visibleRows.filter(item => {
      return item.mid && !FRQCY.state.knownMessageIds.has(item.mid);
    });

    handleUnreadRows(newRows);

    FRQCY.state.messageMap = {};

    visibleRows.forEach(item => {
      if (!item.mid) return;

      const cleanPayload = parseReplyPayload(item.channelBody);
      const time = cleanTime(item.row.querySelector(".date-and-time")?.textContent || "");

      FRQCY.state.knownMessageIds.add(item.mid);

      FRQCY.state.messageMap[item.mid] = {
        id: item.mid,
        author: item.parsed.author,
        message: cleanPayload.body,
        rawMessage: item.parsed.message,
        channel: item.channel,
        time,
        system: item.parsed.system
      };

      rememberMessage(FRQCY.state.messageMap[item.mid]);
    });

    target.innerHTML = currentRows
      .map(item => renderMessage(item.row, item.parsed, item.mid, item.channelBody))
      .join("");

    if (!target.innerHTML.trim()) {
      target.innerHTML = `
        <div class="frqcy-empty-channel">
          <strong>${escapeHTML(FRQCY.channels[FRQCY.state.currentChannel]?.name || "#general")}</strong>
          <span>Aucune transmission sur cette fréquence pour le moment.</span>
        </div>
      `;
    }

    if (forceScroll || wasNearBottom || !FRQCY.state.initialized) {
      target.scrollTop = target.scrollHeight;
    }

    FRQCY.state.initialized = true;
  }

  function handleUnreadRows(newRows) {
    if (!FRQCY.state.initialized || !newRows.length) return;

    newRows.forEach(item => {
      const reply = parseReplyPayload(item.channelBody);
      const mentioned = mentionsCurrentUser(reply.body);

      const shouldCount =
        !isFrequencyOpen() ||
        item.channel !== FRQCY.state.currentChannel;

      if (!shouldCount) return;

      FRQCY.state.channelUnread[item.channel] =
        (FRQCY.state.channelUnread[item.channel] || 0) + 1;

      if (mentioned) {
        FRQCY.state.channelMentions[item.channel] = true;
      }
    });

    FRQCY.state.unreadCount = Object.values(FRQCY.state.channelUnread)
      .reduce((sum, count) => sum + Number(count || 0), 0);

    FRQCY.state.hasUnreadMention = Object.values(FRQCY.state.channelMentions)
      .some(Boolean);

    updateBadge();
  }

  function renderMessage(row, parsedData, forcedMid, forcedBody) {
    const parsed = parsedData || parseMessageRow(row);
    const mid = forcedMid || getMessageId(row, parsed);
    const time = cleanTime(row.querySelector(".date-and-time")?.textContent || "");
    const body = forcedBody || parseChannelPayload(parsed.message).body;

    registerMentionName(parsed.author);

    if (!body || isControlMessage(parsed.message) || /Vous êtes déconnecté|Rejoindre le Chat/i.test(body)) return "";

    if (parsed.system) {
      return `
        <div class="frqcy-system-message" data-mid="${escapeHTML(mid)}">
          <span>${escapeHTML(body)}</span>
        </div>
      `;
    }

    const reply = parseReplyPayload(body);
    const nativeAvatar = row.querySelector(".cb-avatar img")?.src || "";
    const member = FRQCY.state.membersByName[normalizeName(parsed.author)];
    const userId = parsed.userId || member?.userId || "";
    const cachedAvatar = userId ? FRQCY.state.avatarCache[userId] : "";
    const avatar = nativeAvatar || cachedAvatar;
    const color = parsed.color || member?.color || FRQCY.state.colorByName[normalizeName(parsed.author)] || "";
    const role = getRole(parsed.author);
    const mentioned = mentionsCurrentUser(reply.body);

    if (userId && !FRQCY.state.avatarCache[userId] && !nativeAvatar) {
      loadAvatar(userId, parsed.author);
    }

    return `
      <article class="frqcy-message frqcy-role-${role || "member"} ${mentioned ? "frqcy-message-mentioned" : ""}" data-mid="${escapeHTML(mid)}">
        ${renderAvatar(parsed.author, avatar, "frqcy-avatar")}

        <div class="frqcy-message-main">
          <div class="frqcy-message-meta">
            <strong class="frqcy-name" ${color ? `style="color:${escapeHTML(color)}"` : ""}>
              ${getRoleIcon(role)}
              <span>${escapeHTML(parsed.author)}</span>
            </strong>

            <span>
              ${time ? escapeHTML(time) : ""}
              <button class="frqcy-reply-btn" type="button" data-reply-mid="${escapeHTML(mid)}" title="Répondre">↩</button>
            </span>
          </div>

          ${reply.replyId ? renderReplyBlock(reply.replyId) : ""}

          <div class="frqcy-message-content">${renderMentions(reply.body)}</div>
        </div>
      </article>
    `;
  }

  function parseMessageRow(row) {
    const msg = row.querySelector(".msg");

    const username =
      row.querySelector(".chatbox-message-username, .chatbox-user-username, .chatbox-username") ||
      msg?.querySelector("strong");

    let author = username ? username.textContent.trim().replace(/^@\s*/, "").replace(/\s*:$/, "") : "";
    let userId = username?.dataset?.user || "";
    let color = getNativeColor(username);

    let message = msg ? msg.innerText.trim() : row.innerText.trim();
    message = message.trim();

    const isSystem =
      /a rejoint le chat|a été déconnecté|s'est déconnecté|est déconnecté|a quitté le chat|session timeout/i.test(message);

    if (isSystem) {
      return { author: "FREQUENCY", userId: "", color: "", message, system: true };
    }

    const knownMember = FRQCY.state.membersByName[normalizeName(author)];

    if (!userId && knownMember?.userId) userId = knownMember.userId;
    if (!color && knownMember?.color) color = knownMember.color;

    if (author) {
      const authorPattern = new RegExp("^@?\\s*" + escapeRegExp(author) + "\\s*:?\\s*", "i");
      message = message.replace(authorPattern, "").trim();
    }

    return {
      author: author || "FREQUENCY",
      userId,
      color,
      message,
      system: false
    };
  }

  function parseChannelPayload(message) {
    const raw = String(message || "");
    const match = raw.match(/^\[channel:([a-z0-9_-]+)\]\n?/i);

    if (!match) {
      return {
        channel: FRQCY.defaultChannel,
        body: raw
      };
    }

    const channel = normalizeChannel(match[1]);

    return {
      channel: FRQCY.channels[channel] ? channel : FRQCY.defaultChannel,
      body: raw.replace(match[0], "").trim()
    };
  }

  function encodeChannelPayload(channelId, body) {
    const channel = normalizeChannel(channelId);
    return `[channel:${channel}]\n${body}`;
  }

  function normalizeChannel(channelId) {
    return String(channelId || FRQCY.defaultChannel)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");
  }

  function getMessageId(row, parsed) {
    if (row.dataset.mid) return row.dataset.mid;
    if (row.dataset.frqcyMid) return row.dataset.frqcyMid;

    const time = cleanTime(row.querySelector(".date-and-time")?.textContent || "");
    const base = [
      parsed?.author || "",
      time,
      parsed?.message || row.innerText || ""
    ].join("|");

    const id = "frqcy-" + simpleHash(base);
    row.dataset.frqcyMid = id;

    return id;
  }

  function simpleHash(str) {
    let hash = 0;
    const text = String(str || "");

    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }

    return Math.abs(hash).toString(36);
  }

  function parseReplyPayload(message) {
    const raw = String(message || "");
    const match = raw.match(/^\[reply=([^\]]+)\]\n?/i);

    if (!match) return { replyId: "", body: raw };

    return {
      replyId: match[1],
      body: raw.replace(match[0], "").trim()
    };
  }

  function renderReplyBlock(replyId) {
    const source = FRQCY.state.messageMap[replyId] || FRQCY.state.replyCache[replyId];

    if (!source) {
      return `
        <button type="button" class="frqcy-reply-block frqcy-reply-missing" data-reply-jump="${escapeHTML(replyId)}">
          <span class="frqcy-reply-author">Message précédent</span>
          <span class="frqcy-reply-snippet">Message introuvable ou trop ancien</span>
        </button>
      `;
    }

    return `
      <button type="button" class="frqcy-reply-block" data-reply-jump="${escapeHTML(replyId)}">
        <span class="frqcy-reply-author">${escapeHTML(source.author)}</span>
        <span class="frqcy-reply-snippet">${escapeHTML(truncate(source.message, 90))}</span>
      </button>
    `;
  }

  function selectReply(mid) {
    const source = FRQCY.state.messageMap[mid] || FRQCY.state.replyCache[mid];

    if (!source || source.system) return;

    FRQCY.state.replyTarget = {
      id: mid,
      author: source.author,
      message: source.message
    };

    renderReplyPreview();
    refocusInput(0);
  }

  function renderReplyPreview() {
    const preview = document.querySelector("#frqcy-reply-preview");
    const target = FRQCY.state.replyTarget;

    if (!preview) return;

    if (!target) {
      preview.hidden = true;
      preview.innerHTML = "";
      return;
    }

    preview.hidden = false;
    preview.innerHTML = `
      <div class="frqcy-reply-preview-inner">
        <div>
          <strong>Réponse à ${escapeHTML(target.author)}</strong>
          <span>${escapeHTML(truncate(target.message, 120))}</span>
        </div>
        <button type="button" data-frqcy-cancel-reply aria-label="Annuler la réponse">×</button>
      </div>
    `;
  }

  function clearReply() {
    FRQCY.state.replyTarget = null;
    renderReplyPreview();
  }

  function jumpToMessage(mid) {
    const target = document.querySelector(`.frqcy-message[data-mid="${cssEscape(mid)}"]`);
    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    target.classList.remove("frqcy-message-flash");
    void target.offsetWidth;
    target.classList.add("frqcy-message-flash");
  }

  function loadReplyCache() {
    try {
      FRQCY.state.replyCache = JSON.parse(
        localStorage.getItem(FRQCY.state.replyCacheKey) || "{}"
      );
    } catch {
      FRQCY.state.replyCache = {};
    }
  }

  function saveReplyCache() {
    try {
      localStorage.setItem(
        FRQCY.state.replyCacheKey,
        JSON.stringify(FRQCY.state.replyCache)
      );
    } catch {}
  }

  function rememberMessage(message) {
    if (!message || !message.id || message.system) return;

    FRQCY.state.replyCache[message.id] = {
      id: message.id,
      author: message.author,
      message: message.message,
      channel: message.channel,
      time: message.time
    };

    const entries = Object.entries(FRQCY.state.replyCache);

    if (entries.length > 400) {
      FRQCY.state.replyCache = Object.fromEntries(entries.slice(-400));
    }

    saveReplyCache();
  }

  function handleTypingInput() {
    const input = document.querySelector("#frqcy-input");
    if (!input || !input.value.trim()) return;

    sendTypingSignal();
  }

  function handleTypingKeydown(event) {
    if (event.key === "Enter") {
      delete FRQCY.state.typingUsers[getTypingKey(FRQCY.state.currentChannel, FRQCY.state.currentUser)];
      updateTypingIndicator();
    }
  }

  function sendTypingSignal() {
    const now = Date.now();
    const user = FRQCY.state.currentUser;
    const channel = FRQCY.state.currentChannel;

    if (!user || !canWriteChannel(channel)) return;
    if (now - FRQCY.state.lastTypingSent < FRQCY.typingThrottle) return;

    FRQCY.state.lastTypingSent = now;

    sendNativeControlMessage(`[frqcy:typing|${channel}|${user}|${now}]`);
  }

  function sendNativeControlMessage(message) {
    const cb = getChatboxDoc();
    if (!cb) return;

    const nativeInput = cb.querySelector(FRQCY.selectors.input);
    const nativeSubmit = cb.querySelector(FRQCY.selectors.submit);
    const frqcyInput = document.querySelector("#frqcy-input");

    if (!nativeInput || !nativeSubmit) return;

    const wasWriting = document.activeElement === frqcyInput;
    const selectionStart = frqcyInput?.selectionStart || 0;
    const selectionEnd = frqcyInput?.selectionEnd || 0;

    nativeInput.value = message;
    nativeSubmit.click();

    if (wasWriting && frqcyInput) {
      restoreInputFocus(selectionStart, selectionEnd);
    }
  }

  function restoreInputFocus(selectionStart = null, selectionEnd = null) {
    const input = document.querySelector("#frqcy-input");
    if (!input || input.readOnly) return;

    const start = selectionStart ?? input.value.length;
    const end = selectionEnd ?? input.value.length;

    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start, end);
    });

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start, end);
    }, 50);

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start, end);
    }, 150);
  }

  function refocusInput(delay = 0) {
    setTimeout(() => {
      const input = document.querySelector("#frqcy-input");
      if (!input || input.readOnly) return;

      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }, delay);
  }

  function parseControlPayload(message) {
    const raw = String(message || "").trim();

    let typing = raw.match(/^\[frqcy:typing\|([a-z0-9_-]+)\|(.+?)\|(\d+)\]$/i);
    if (typing) {
      return {
        type: "typing",
        channel: normalizeChannel(typing[1]),
        user: typing[2].trim(),
        time: Number(typing[3])
      };
    }

    typing = raw.match(/^\[frqcy:typing\|(.+?)\|(\d+)\]$/i);
    if (typing) {
      return {
        type: "typing",
        channel: FRQCY.defaultChannel,
        user: typing[1].trim(),
        time: Number(typing[2])
      };
    }

    return null;
  }

  function isControlMessage(message) {
    return /^\[frqcy:/i.test(String(message || "").trim());
  }

  function rememberTyping(payload) {
    if (!payload || payload.type !== "typing" || !payload.user || !payload.time) return;
    if (!canAccessChannel(payload.channel)) return;

    const userKey = normalizeName(payload.user);
    const currentKey = normalizeName(FRQCY.state.currentUser);

    if (!userKey || userKey === currentKey) return;

    FRQCY.state.typingUsers[getTypingKey(payload.channel, payload.user)] = {
      name: payload.user,
      channel: payload.channel,
      time: payload.time
    };
  }

  function getTypingKey(channel, user) {
    return `${normalizeChannel(channel)}:${normalizeName(user)}`;
  }

  function updateTypingIndicator() {
    const target = document.querySelector("#frqcy-typing");
    if (!target) return;

    const now = Date.now();

    Object.keys(FRQCY.state.typingUsers).forEach(key => {
      if (now - FRQCY.state.typingUsers[key].time > FRQCY.typingTTL) {
        delete FRQCY.state.typingUsers[key];
      }
    });

    const users = Object.values(FRQCY.state.typingUsers)
      .filter(item => item.channel === FRQCY.state.currentChannel)
      .map(item => item.name)
      .filter(Boolean);

    if (!users.length) {
      target.innerHTML = "";
      target.classList.remove("frqcy-typing-active");
      return;
    }

    target.classList.add("frqcy-typing-active");

    if (users.length === 1) {
      target.innerHTML = `<span>${escapeHTML(users[0])} est en train d'écrire</span>`;
      return;
    }

    if (users.length === 2) {
      target.innerHTML = `<span>${escapeHTML(users[0])} et ${escapeHTML(users[1])} écrivent</span>`;
      return;
    }

    target.innerHTML = `<span>Plusieurs personnes écrivent</span>`;
  }

  function mentionUser(name) {
    const input = document.querySelector("#frqcy-input");
    if (!input) return;

    const mention = `@${name} `;
    input.value = input.value.trim() ? `${input.value.trim()} ${mention}` : mention;
    refocusInput(0);

    sendTypingSignal();
  }

  function registerMentionName(name) {
    const clean = String(name || "").trim();
    if (clean && clean !== "FREQUENCY") FRQCY.state.mentionNames.add(clean);
  }

  function getMentionNames() {
    const names = [
      ...FRQCY.state.mentionNames,
      ...Object.values(FRQCY.state.membersByName).map(member => member.name),
      ...FRQCY.staff.admins,
      ...FRQCY.staff.moderators,
      FRQCY.state.currentUser
    ].filter(Boolean);

    return Array.from(new Map(names.map(name => [normalizeName(name), name])).values())
      .sort((a, b) => b.length - a.length);
  }

  function renderMentions(text) {
    const raw = String(text || "");
    const names = getMentionNames();

    if (!names.length) return escapeHTML(raw);

    const pattern = new RegExp(`@(${names.map(escapeRegExp).join("|")})(?=$|\\s|[.,!?;:])`, "gi");

    let html = "";
    let lastIndex = 0;

    raw.replace(pattern, (match, _name, index) => {
      html += escapeHTML(raw.slice(lastIndex, index));
      html += `<span class="frqcy-mention">${escapeHTML(match)}</span>`;
      lastIndex = index + match.length;
      return match;
    });

    html += escapeHTML(raw.slice(lastIndex));
    return html;
  }

  function mentionsCurrentUser(text) {
    const current = String(FRQCY.state.currentUser || "").trim();

    if (!current) return false;

    const pattern = new RegExp(`@${escapeRegExp(current)}(?=$|\\s|[.,!?;:])`, "i");
    return pattern.test(String(text || ""));
  }

  function renderAvatar(name, avatarUrl, className) {
    if (avatarUrl) {
      return `
        <span class="${className} frqcy-real-avatar">
          <img src="${escapeHTML(avatarUrl)}" alt="${escapeHTML(name)}">
        </span>
      `;
    }

    return `<span class="${className}">${escapeHTML(getInitials(name))}</span>`;
  }

  function loadAvatar(userId, username) {
    FRQCY.state.avatarCache[userId] = "";

    fetch(`/u${encodeURIComponent(userId)}`)
      .then(response => response.text())
      .then(html => {
        const doc = new DOMParser().parseFromString(html, "text/html");

        const avatar =
          Array.from(doc.querySelectorAll("img"))
            .find(img => img.alt?.trim().toLowerCase() === username.trim().toLowerCase()) ||
          Array.from(doc.querySelectorAll("img"))
            .find(img => /zupimages|servimg|imgfast|illiweb|2img/i.test(img.src) && !/icon_|logo/i.test(img.src));

        if (avatar?.src) {
          FRQCY.state.avatarCache[userId] = avatar.src;
          syncFrequency(false);
        }
      })
      .catch(() => {
        FRQCY.state.avatarCache[userId] = "";
      });
  }

  function getNativeColor(el) {
    if (!el) return "";
    return el.style?.color || el.closest("[style*='color']")?.style?.color || "";
  }
	
	function getSlashCommand(message) {
  const match = String(message || "").trim().match(/^\/([a-z]+)(?:\s|$)/i);
  return match ? match[1].toLowerCase() : "";
}

function isNativeChatboxCommand(message) {
  const command = getSlashCommand(message);

  return [
    "clear",
    "cls",
    "ban",
    "unban",
    "mod",
    "unmod",
    "banlist",
    "help",
    "roll",
    "me",
    "kick",
    "exit",
    "abs",
    "away"
  ].includes(command);
}

function isClearCommand(message) {
  const command = getSlashCommand(message);
  return command === "clear" || command === "cls";
}

function resetLocalChatStateAfterClear() {
  FRQCY.state.knownMessageIds = new Set();
  FRQCY.state.messageMap = {};
  FRQCY.state.replyCache = {};
  FRQCY.state.channelUnread = {};
  FRQCY.state.channelMentions = {};
  FRQCY.state.unreadCount = 0;
  FRQCY.state.hasUnreadMention = false;

  saveReplyCache();
  updateBadge();
}

  function sendMessage(event) {
    event.preventDefault();

    const input = document.querySelector("#frqcy-input");
    const message = input.value.trim();
    const channel = FRQCY.state.currentChannel;

    if (!message || !canWriteChannel(channel)) {
      refocusInput(0);
      return;
    }

    const cb = getChatboxDoc();
    if (!cb) {
      refocusInput(0);
      return;
    }

    const nativeInput = cb.querySelector(FRQCY.selectors.input);
    const nativeSubmit = cb.querySelector(FRQCY.selectors.submit);

    if (!nativeInput || !nativeSubmit) {
      refocusInput(0);
      return;
    }

    const isCommand = isNativeChatboxCommand(message);

const body = FRQCY.state.replyTarget && !isCommand
  ? `[reply=${FRQCY.state.replyTarget.id}]\n${message}`
  : message;

const finalMessage = isCommand
  ? message
  : encodeChannelPayload(channel, body);

    nativeInput.value = finalMessage;
    nativeSubmit.click();
	  
	  if (isClearCommand(message)) {
  resetLocalChatStateAfterClear();
}

    input.value = "";
    clearReply();

    delete FRQCY.state.typingUsers[getTypingKey(channel, FRQCY.state.currentUser)];
    updateTypingIndicator();

    refocusInput(0);
    refocusInput(50);
    refocusInput(150);

    setTimeout(() => {
      syncFrequency(true);
      refocusInput(0);
      refocusInput(80);
    }, 500);
  }

  function updateBadge() {
    const badge = document.querySelector("#frqcy-badge");
    const toggle = document.querySelector("#frqcy-toggle");

    if (!badge || !toggle) return;

    FRQCY.state.unreadCount = Object.values(FRQCY.state.channelUnread)
      .reduce((sum, count) => sum + Number(count || 0), 0);

    FRQCY.state.hasUnreadMention = Object.values(FRQCY.state.channelMentions)
      .some(Boolean);

    if (FRQCY.state.unreadCount > 0) {
      badge.textContent = FRQCY.state.unreadCount;
      toggle.classList.add("frqcy-has-unread");
      toggle.classList.toggle("frqcy-has-mention", FRQCY.state.hasUnreadMention);
    } else {
      badge.textContent = "";
      toggle.classList.remove("frqcy-has-unread", "frqcy-has-mention");
    }

    renderChannels();
  }

  function installDevTools() {
    window.FRQCY_DEV = {
      pause() {
        if (!FRQCY.state.syncTimer) {
          console.log("FRQCY is already paused");
          return;
        }

        clearInterval(FRQCY.state.syncTimer);
        FRQCY.state.syncTimer = null;
        console.log("FRQCY paused");
      },

      resume() {
        if (FRQCY.state.syncTimer) {
          console.log("FRQCY is already running");
          return;
        }

        FRQCY.state.syncTimer = setInterval(syncFrequency, FRQCY.refreshRate);
        console.log("FRQCY resumed");
      },

      sync() {
        syncFrequency(true);
        console.log("FRQCY synced");
      },

      state() {
        console.log(FRQCY.state);
        return FRQCY.state;
      }
    };
  }

  function normalizeName(name) {
    return String(name).trim().toLowerCase();
  }

  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function getInitials(name) {
    return String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase();
  }

  function isNearBottom(el) {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  function cleanTime(time) {
    return String(time).replace("[", "").replace("]", "").trim();
  }

  function truncate(text, max = 90) {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    return clean.length > max ? clean.slice(0, max - 1) + "…" : clean;
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(String(value));
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function init() {
    loadReplyCache();
    detectCurrentUser();
    createInterface();
    ensureChatboxFrame();
    syncFrequency(true);

    FRQCY.state.syncTimer = setInterval(syncFrequency, FRQCY.refreshRate);

    installDevTools();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
