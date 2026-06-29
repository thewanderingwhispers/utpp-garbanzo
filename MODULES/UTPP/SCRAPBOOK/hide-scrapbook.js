/* $(function () {

  if (typeof _userdata !== 'undefined' && _userdata.session_logged_in !== 1) {
    $('#fa-pins-button').hide();
    $('#FAM-button-open').hide();
  }

}); */

$(function () {

  const isGuest =
    typeof _userdata === "undefined" ||
    _userdata.session_logged_in !== 1;

  if (isGuest) {
    $(
      "#fa-pins-button, " +
      "#FAM-button-open, " +
      "#logbook-toggle, " +
      "#frqcy-toggle, " +
      "#rpg-panel-button, " +
      "#KRSN-button"
    ).hide();
  }

});
