/* $(function () {

  const update = () => {
    const notif = $('#notiffi_button').is(':visible');

    if (notif) {
      $('.sidebar').addClass('has-notiffi');
    } else {
      $('.sidebar').removeClass('has-notiffi');
    }
  };

  update();

  new MutationObserver(update).observe(document.body, {
    childList: true,
    subtree: true
  });

}); */

$(function () {

  const update = () => {
    const $sidebar = $('.sidebar');

    const notif = $('#notiffi_button').is(':visible');
    const logbook = $('#logbook-toggle').is(':visible');
    const frqcy = $('#frqcy-toggle').is(':visible');
    const rpgPanel = $('#rpg-panel-button').is(':visible');
    const pins = $('#fa-pins-button').is(':visible');
    const recentTopics = $('#KRSN-button').is(':visible');

    $sidebar.toggleClass('has-notiffi', notif);
    $sidebar.toggleClass('has-logbook', logbook);
    $sidebar.toggleClass('has-frqcy', frqcy);
    $sidebar.toggleClass('has-rpg-panel', rpgPanel);
    $sidebar.toggleClass('has-pins', pins);
    $sidebar.toggleClass('has-recent-topics', recentTopics);
  };

  update();

  new MutationObserver(update).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

});
