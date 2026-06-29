$(function () {

  if (typeof _userdata !== 'undefined' && _userdata.session_logged_in !== 1) {
    $('#notiffi_button').hide();
    $('#fa-pins-button').hide();
    $('#FAM-button-open').hide();
    $('#logbook-toggle').hide();
    $('#frqcy-toggle').hide();
    $('#rpg-panel-button').hide();
    $('#KRSN-button').hide();
  }

});
