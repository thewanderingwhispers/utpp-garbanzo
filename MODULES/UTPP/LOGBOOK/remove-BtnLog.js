(function () {
  const data = window._userdata || {};
  const userId = String(data.user_id || "").trim();
  const session = data.session_logged_in;

  const isMember =
    session === 1 ||
    session === true ||
    session === "1" ||
    (userId && userId !== "-1" && userId !== "0");

  document.documentElement.classList.toggle("fa-member", isMember);
  document.documentElement.classList.toggle("fa-guest", !isMember);

  if (!isMember) {
    document.querySelectorAll("#logbook-toggle, #logbook-root").forEach(function (element) {
      element.remove();
    });
  }
})();
