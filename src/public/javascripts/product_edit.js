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

$(document).ready(function() {
    var common_settings = {
            method          :  'PUT',
            cancel          :  i18n.cancel,
            submit          :  i18n.save,
            indicator       :  i18n.saving,
            tooltip         :  i18n.clickToEdit,
            placeholder     :  i18n.clickToEdit,
            submitdata      :  $.extend({ authenticity_token: AUTH_TOKEN }, KT.common.getSearchParams()),
            onerror         :  function(settings, original, xhr) {
                original.reset();
                $("#notification").replaceWith(xhr.responseText);
                notices.checkNotices();
            }
        };


	$('.edit_select_product_gpg').each(function(){
   		var element = $(this),
   			settings = { 
	            type            :  'select',
	            name            :  element.attr('name'),
	            data   			:  element.data('options'),
	            onsuccess       :  function(result, status, xhr){
	            	var data = element.data('options');
	            	
	            	data["selected"] = result;
	            	element.html(data[result]);
	            	if( result !== "" ){
		            	KT.common.customConfirm(
		            		i18n.productUpdateKeyConfirm + "<br/><br/>" + i18n.proudctUpdateKeyWarning,
		            		function(){
		            			$.ajax({
		            				type 	: 'PUT',
		            				url		: element.data('url'), 
		            				data	: { 'product[gpg_all_repos]' : true },
		            				success : function(data){
		            					notices.checkNotices();					
		            				}
		            			});
		            		},
		            		function(){
		            			notices.checkNotices();
		            		}
		            	);
            		}
	            }
        	};
        $(this).editable($(this).attr('data-url'), $.extend(common_settings, settings));
  	});
  
});
