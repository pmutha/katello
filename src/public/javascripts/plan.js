/**
 Copyright 2011 Red Hat, Inc.

 This software is licensed to you under the GNU General Public
 License as published by the Free Software Foundation; either version
 2 of the License (GPLv2) or (at your option) any later version.
 There is NO WARRANTY for this software, express or implied,
 including the implied warranties of MERCHANTABILITY,
 NON-INFRINGEMENT, or FITNESS FOR A PARTICULAR PURPOSE. You should
 have received a copy of GPLv2 along with this software; if not, see
 http://www.gnu.org/licenses/old-licenses/gpl-2.0.txt.
*/

KT.panel.list.registerPage('sync_plans', { create : 'new_sync_plan' });

$(document).ready(function() {

  $.editable.addInputType( 'datepicker', {

    /* create input element */
    element: function( settings, original ) {
      var form = $( this ), input = $( '<input data-change="false"/>' );
      if (settings.width != 'none') { input.width(settings.width); }
      if (settings.height != 'none') { input.height(settings.height); }
      input.attr( 'autocomplete','off' );
      form.append( input );
      return input;
    },

    /* attach jquery.ui.datepicker to the input element */
    plugin: function( settings, original ) {
      var form = this, input = form.find( "input" );
      settings.onblur = 'nothing';

      datepicker = {
        // keep track of date selection state
        onSelect: function() {
          input.attr('data-change', 'true'); 
        },
        // reset form if we lose focus and date was not selected
        onClose: function() {
          if ($(this).attr('data-change') == 'false') {
            original.reset( form );
          } 
        }
      };
      input.datepicker(datepicker);
    }
  } );

  $.editable.addInputType( 'timepicker', {

    /* create input element */
    element: function( settings, original ) {
      var form = $( this ), input = $( '<input data-change="false"/>' );
      if (settings.width != 'none') { input.width(settings.width); }
      if (settings.height != 'none') { input.height(settings.height); }
      input.attr( 'autocomplete','off' );
      form.append( input );
      return input;
    },

    plugin: function( settings, original ) {
      var form = this, input = form.find( "input" );
      settings.onblur = 'ignore';
      input.timepickr({convention: 12})
      .click();
    }
  } );


    KT.panel.set_expand_cb(function(){
        $("#datepicker").datepicker({
            changeMonth: true,
            changeYear: true
        });

         $("#timepicker").timepickr({
            convention: 12,
            trigger: "focus"
         });
    });

});
