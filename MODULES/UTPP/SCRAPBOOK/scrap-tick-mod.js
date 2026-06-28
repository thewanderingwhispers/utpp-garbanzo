window.KRSN_syncPanelsSidebar = function () {
  const sidebar = document.querySelector(".sidebar");
  const PANEL_SIZE = 500;

  if (!sidebar) return;

  const pinsOpen = $("#fa-pins-panel").hasClass("open");
  const recentOpen = $("#KRSN-panel").hasClass("open");
  const shouldPush = pinsOpen || recentOpen;

  requestAnimationFrame(function () {
    sidebar.style.transform = shouldPush
      ? `translateX(-${PANEL_SIZE}px)`
      : "";

    document.documentElement.style.setProperty(
      "--sidebar-offset",
      shouldPush ? `${PANEL_SIZE}px` : "0px"
    );
  });
};
