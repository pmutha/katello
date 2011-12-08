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
//some variables that are used throughout the panel
var thisPanel = null;
var subpanel = null;
var subpanelSpacing = 55;
var panelLeft = null;
var count = 0;
$(document).ready(function () {
    $('.left').resize(function () {
        var apanel = $('.panel');
        panelLeft = $(this).width();
        $('.block').width(panelLeft - 17);
        apanel.width(940 - panelLeft);
        $('.right').width(898 - panelLeft);
        if (apanel.hasClass('opened')) {
            apanel.css({
                "left": (panelLeft)
            });
        }
        $('.left #new').css({
            "width": "10em"
        });
        $('.list-title').width(panelLeft);
        $('#list-title').width(panelLeft);
        if ($(this).hasClass('column_panel_3')) {
            var fontsize = Math.floor((panelLeft / 430) * 100);
            //if it's bigger than 100%, make it 100%.
            fontsize = (fontsize > 100) ? 100 : fontsize;
            $('#systems .block').css({
                "font-size": parseInt(fontsize, 10) + "%"
            });
        }
    }).resize();
    //$('#list .block').linkHover({"timeout":200});
    thisPanel = $("#panel");
    subpanel = $('#subpanel');
    var activeBlock = null;
    var activeBlockId = null;
    var ajax_url = null;

    $('.block').live('click', function (event) {
        if (event.target.nodeName === "A" && event.target.className.match('content_add_remove')) {
            return false;
        } else {
            activeBlock = $(this);
            ajax_url = activeBlock.attr("data-ajax_url");
            activeBlockId = activeBlock.attr('id');
            if(event.ctrlKey && !thisPanel.hasClass('opened') && !(event.target.id == "new") && !activeBlock.hasClass('active')) {
                if (activeBlock.hasClass('active')) {
                    activeBlock.removeClass('active');
                } else {
                    activeBlock.addClass('active');
                    activeBlock.find('.arrow-right').hide();
                }
            } else {
                if(activeBlock.hasClass('active') && thisPanel.hasClass('opened')){
                    KT.panel.closePanel(thisPanel);
                } else {
                    $.bbq.pushState({
                        panel: activeBlockId
                    });
                    activeBlock.find('.arrow-right').show();
                }
            }
            //update the selected count
            KT.panel.updateResult();
            return false;
        }
    });
    $('.close').live("click", function () {
        if ($(this).attr("data-close") === "panel" || ($(this).attr("data-close") !== "subpanel" && $(this).parent().parent().hasClass('opened'))) {
            KT.panel.closePanel(thisPanel);
            KT.panel.closeSubPanel(subpanel);
        }
        else { //closing the subpanel
            KT.panel.closeSubPanel(subpanel);
        }
        return false;
    });
    $(window).resize(function () {
        KT.panel.panelResize($('#panel_main'), false);
        KT.panel.panelResize($('#subpanel_main'), true);
    });
    $('.subpanel_element').live('click', function () {
        KT.panel.openSubPanel($(this).attr('data-url'));
    });

    // It is possible for the pane (e.g. right) of a panel to contain navigation
    // links.  When that occurs, it should be possible to click the navigation
    // link and only that pane reflect the transition to the new page. The element
    // below helps to facilitate that by binding to the click event for a navigation
    // element with the specified id, sending a request to the server using the link
    // selected and then replacing the content of the pane with the response.
    $('.navigation_element > a').live('click', function () {
        // if a view is a pane within a panel
        $.ajax({
            cache: 'false',
            type: 'GET',
            url: $(this).attr('href'),
            dataType: 'html',
            success: function (data) {
                thisPanel.find(".panel-content").html(data);
                KT.panel.panelResize($('#panel_main'), false);
                KT.panel.get_expand_cb()();
            }
        });
        return false;
    });
    $('.left').resizable({
        maxWidth: 550,
        minWidth: 350,
        grid: 25,
        handles: 'e',
        autoHide: true
    });

    //register a common select none action
    KT.panel.actions.registerAction("select_none", {});
    $('#select-none').mouseup(function(){
        $('.block.active').removeClass('active');
        KT.panel.updateResult();
    });
    //create the initial selected count
    KT.panel.updateResult();
    //register the default actions for the page's actions partial
    KT.panel.actions.registerDefaultActions();

    $('.search').fancyQueries();
    if (KT.panel.control_bbq) {
        //hash change for panel to trigger on refresh or back/forward or link passing
        $(window).bind('hashchange', KT.panel.hash_change);
        $(window).trigger('hashchange');
    }
    //end doc ready
});

var list = (function(){
   return {
       last_child : function() {
         return $("#list").children().last();
       },
       add : function(html) {
           $('#list').append($(html).hide().fadeIn(function(){
               $(this).addClass("add", 250, function(){
                   $(this).removeClass("add", 250);
               });
           }));
           return false;
       },
       remove : function(id){
           $('#' + id).fadeOut(function(){
               $(this).empty().remove();
               KT.panel.updateResult();
           });
           return false;
       },
       refresh : function(id, url, success_cb){
           var jQid = $('#' + id);
            $.ajax({
                cache: 'false',
                type: 'GET',
                url: url,
                dataType: 'html',
                success: function(data) {
                    notices.checkNotices();
                    jQid.html(data);
                    if (success_cb) {
                        success_cb();
                    }
                }
            });
           return false;
       }
   };
})();

$(window).ready(function(){
    if ($('#container').length > 0) {
        KT.panel.registerPanel($('#panel-frame'), 0);
        $(window).scroll(KT.panel.list.extend);
    }
    KT.panel.actions.resetActions();
});
KT.panel = (function ($) {
    var retrievingNewContent= false,
        control_bbq = true,
        current_scroll = 0,
        panels_list = [],
        left_list_content = "",
        expand_cb = function () {},
        //callback after a pane is loaded
        contract_cb = function () {},
        switch_content_cb = function () {},
        select_item = function (activeBlockId) {
            var activeBlock = $('#' + KT.common.escapeId(activeBlockId)),
                ajax_url = activeBlock.attr("data-ajax_url"),
                previousBlockId = null;
            thisPanel = $("#panel");
            subpanel = $('#subpanel');
            if (activeBlock.length) {
                if (!thisPanel.hasClass('opened') && thisPanel.attr("data-id") !== activeBlockId) {
                    $('.block.active').removeClass('active');
                    // Open the Panel                           /4
                    thisPanel.css({
                        "z-index": "200"
                    });
                    thisPanel.parent().css({
                        "z-index": "1"
                    });
                    thisPanel.animate({
                        left: (panelLeft) + "px",
                        opacity: 1
                    }, 200, function () {
                        $(this).css({
                            "z-index": "200"
                        });
                    }).removeClass('closed').addClass('opened').attr('data-id', activeBlockId);
                    activeBlock.addClass('active');
                    previousBlockId = activeBlockId;
                    panelAjax(activeBlockId, ajax_url, thisPanel, false);
                }
                else if (thisPanel.hasClass('opened') && thisPanel.attr("data-id") !== activeBlockId) {
                    switch_content_cb();
                    $('.block.active').removeClass('active');
                    closeSubPanel(subpanel); //close the subpanel if it is open
                    // Keep the thisPanel open if they click another block
                    // remove previous classes besides opened
                    thisPanel.css({
                        "z-index": "200"
                    });
                    thisPanel.parent().css({
                        "z-index": "1"
                    });
                    thisPanel.addClass('opened').attr('data-id', activeBlockId);
                    $("#" + previousBlockId).removeClass('active');
                    activeBlock.addClass('active');
                    previousBlockId = activeBlockId;
                    thisPanel.removeClass('closed');
                    panelAjax(activeBlockId, ajax_url, thisPanel, false);
                }
            }
        },
        panelAjax = function (name, ajax_url, thisPanel, isSubpanel) {
            var spinner = thisPanel.find('.spinner'),
                panelContent = thisPanel.find(".panel-content");
            spinner.show();
            panelContent.hide();
            $.ajax({
                cache: true,
                url: ajax_url,
                dataType: 'html',
                success: function (data, status, xhr) {
                    var pc = panelContent.html(data);
                    spinner.hide();
                    pc.fadeIn(function () {
                        $(".panel-content :input:visible:enabled:first").focus();
                    });
                    if (isSubpanel) {
                        panelResize($('#subpanel_main'), isSubpanel);
                    } else {
                        panelResize($('#panel_main'), isSubpanel);
                    }
                    expand_cb(name);
                    // Add a handler for ellipsis
                    $(".one-line-ellipsis").ellipsis(true);
                },
                error: function (xhr, status, error) {
                    spinner.hide();
                    panelContent.html("<h2>Error</h2><p>There was an error retrieving that row: " + error + "</p>").fadeIn();
                }
            });
        },
        /* must pass a jQuery object */
        panelResize = function (paneljQ, isSubpanel) {
            if (paneljQ.length > 0) {
                adjustHeight(paneljQ, isSubpanel);
            }
            return paneljQ;
        },
        adjustHeight = function (paneljQ, isSubpanel) {
            var leftPanel = $('.left'),
                tupane_panel = $('#panel'),
                default_height = 500,
                new_top = Math.floor($('.list').offset().top - 60),
                header_spacing = tupane_panel.find('.head').height(),
                subnav_spacing = tupane_panel.find('nav').height() + 10,
                content_spacing = paneljQ.height(),
                height = default_height - header_spacing - subnav_spacing,
                panelFrame = paneljQ.parent().parent().parent().parent(),
                extraHeight = 0,
                window_height = $(window).height(),
                subpanelnav;
            if (window_height <= (height + 80) && leftPanel.height() > 550) {
                height = window_height - 80 - header_spacing - subnav_spacing;
            }
            if (isSubpanel) {
                subpanelnav = ($('#subpanel').find('nav').length > 0) ? $('#subpanel').find('nav').height() + 10 : 0;
                height = height - subpanelSpacing * 2 - subpanelnav + subnav_spacing;
            }
            paneljQ.height(height);
            if (paneljQ.length > 0) {
                paneljQ.data('jsp').reinitialise();
            }
        },
        closePanel = function (jPanel) {
            var jPanel = jPanel || $('#panel'),
                content = jPanel.find('.panel-content'),
                position;
            if (jPanel.hasClass("opened")) {
                $('.block.active').removeClass('active');
                jPanel.animate({
                    left: 0,
                    opacity: 0
                }, 400, function () {
                    $(this).css({
                        "z-index": "-1"
                    });
                }).removeClass('opened').addClass('closed').attr("data-id", "");
                content.html('');
                position = KT.common.scrollTop();
                $.bbq.removeState("panel");
                $(window).scrollTop(position);
                updateResult();
                contract_cb(name);
                closeSubPanel(subpanel);
            }
            return false;
        },
        closeSubPanel = function (jPanel) {
            if (jPanel.hasClass("opened")) {
                jPanel.animate({
                    left: 0,
                    opacity: 0
                }, 400, function () {
                    $(this).css({
                        "z-index": "-1"
                    });
                    $(this).removeClass('opened').addClass('closed');
                });
                updateResult();
            }
            return false;
        },
        updateResult = function(){
            //calc the number of active tupane rows
            var len = $('.block.active').length;
            //update the select
            $('#select-result').html(len + i18n.items_selected).effect("highlight", {}, 200);
            $('.numitems').html(len).effect("highlight", {}, 200);
            actions.resetActions(len);
            return len;
        },
        getSelected = function() {
            var to_ret = [];
            $('.block.active').each(function(){
                var id = $(this).attr("id");
                to_ret.push(id.split("_")[1]);
            });
            return to_ret;
        },
        openSubPanel = function (url) {
            var thisPanel = $('#subpanel');
            thisPanel.animate({
                left: panelLeft + "px",
                opacity: 1
            }, 200, function () {
                $(this).css({
                    "z-index": "204"
                });
                $(this).parent().css({
                    "z-index": "2"
                });
                $(this).removeClass('closed').addClass('opened');
            });
            panelAjax('', url, thisPanel, true);
        },
        handleScroll = function (jQPanel, offset) {
            var scrollY = KT.common.scrollTop(),
                scrollX = KT.common.scrollLeft(),
                isfixed = jQPanel.css('position') === 'fixed',
                container = $('#container'),
                bodyY = parseInt(container.position().top, 10),
                left_panel = container.find('.left');
            top_position = left_panel.position().top;
            offset = offset ? offset : 10;
            offset += $('#maincontent').position().left;
            if (jQPanel.length > 0) {
                if (left_panel.height() > 550) {
                    if (scrollY < bodyY) {
                        jQPanel.css({
                            position: 'absolute',
                            top: top_position,
                            left: ''
                        });
                    }
                    else {
                        if (!isfixed && jQPanel.position().top - KT.common.scrollTop() > 40) {
                            jQPanel.stop().css({
                                position: 'fixed',
                                top: 40,
                                left: -scrollX + offset
                            });
                        }
                        else if (($('.left').position().top + $('.left').height() - 20) < (jQPanel.position().top + jQPanel.height() + 40)) {
                            jQPanel.css({
                                position: 'absolute',
                                top: ($('.left').position().top + $('.left').height()) - jQPanel.height() - 40,
                                left: ''
                            });
                        }
                        else if (!isfixed && ($('.left').position().top + $('.left').height()) > (jQPanel.position().top + jQPanel.height() + 40)) {
                            jQPanel.stop().css({
                                position: 'fixed',
                                top: 40,
                                left: -scrollX + offset
                            });
                        }
                    }
                }
            }
        },
        handleScrollResize = function (jQPanel) {
            if (jQPanel.length > 0) {
                if (jQPanel.css('position') === 'fixed') {
                    jQPanel.css('left', '');
                }
            }
        },
        hash_change = function (event, page_load) {
            var refresh = $.bbq.getState("panel"),
                search = $.bbq.getState("search"),
                search_element = $('#search');
            if (page_load) {
                if (refresh && search) {
                    search_element.val(search);
                    $('#search_form').trigger('submit', [page_load, function () {
                        select_item(refresh);
                    }]);
                }
                else if (refresh && !search) {
                    $('#search_form').trigger('submit', [page_load, function () {
                        select_item(refresh);
                    }]);
                }
                else if (search && !refresh) {
                    search_element.val(search);
                    $('#search_form').trigger('submit', [page_load]);
                }
                else {
                    $('#search_form').trigger('submit', [page_load]);
                }
            }
            else {
                if (search_element.val() !== search && search !== undefined) {
                    search_element.val(search);
                    $('#search_form').trigger('submit', [page_load]);
                }
                else if (refresh) {
                    select_item(refresh);
                }
                else if (!refresh) {
                    closePanel();
                }
            }
            return false;
        },
        registerPanel = function (jQPanel, offset) {
            var new_panel = {
                panel: jQPanel,
                offset: offset
            };
            $(window).scroll(function () {
                handleScroll(jQPanel, offset);
            });
            $(window).resize(function () {
                handleScrollResize(jQPanel);
            });
            $(document).bind('helptip-closed', function () {
                handleScroll(jQPanel, offset);
            });
            $(document).bind('helptip-opened', function () {
                handleScroll(jQPanel, offset);
            });
            panels_list.push(new_panel);
        },
        actions = (function(){
            var action_list = {};

            var registerDefaultActions = function() {
                var actions = $(".panel_action");
                actions.each(function(index){
                    var action = $(this);
                    var options = action.find(".options");
                    action.find("a").click(function() {
                        if (!action.hasClass("disabled")) {
                            options.slideDown('fast');
                        }
                    });
                    action.find(".cancel").click(function() {
                        if ($(this).hasClass("disabled")){return}
                        options.slideUp('fast');
                    });
                    action.find(".trigger").click(function() {
                        var params = action_list[action.attr("data-id")];
                        var success = function() {
                            options.slideUp('fast');
                            action.find("input").removeClass("disabled");
                            if (params.success_cb){
                                params.success_cb(getSelected());
                            }
                        };
                        var error = function() {
                          action.find("input").removeClass("disabled");
                          if(params.error_cb) {
                              params.error_cb(getSelected());
                          }
                        };

                        if ($(this).hasClass("disabled")){return}
                        action.find("input").addClass("disabled");

                        if(params.ajax_cb) {
                            params.ajax_cb(getSelected());
                        }
                        else {
                            $.ajax({
                                cache: 'false',
                                type: params.method,
                                url: params.url,
                                data: {ids:getSelected()},
                                success: success,
                                error: error
                            });
                        }
                    });
                });
                updateResult();
            },
            registerAction = function(name, params) {
                /**
                 * params:
                 *    success_cb(data, selected_ids)
                 *    error_cb(data, selected_ids)
                 *    url      //URL for ajax call
                 *    method   //METHOD for ajax call
                 *    unselected_action // true if the action is 'doable' even if
                 *    ajax_cb(id_list, success_cb, error_cb)  //To manually do the ajax call yourself
                 *
                 */
              action_list[name] = params;
            },
            resetActions = function(num) {
              $.each(action_list, function(name, params){
                  if(!params.unselected_action) {
                    var div = $("[data-id=" + name + "]");
                    if (num > 0) {
                        div.removeClass("disabled");
                    }
                    else {
                        div.addClass("disabled");
                    }
                  }
              });
              var actions = $(".panel_action");
              actions.each(function(index){
                var action = $(this);
                action.find('.cancel').click();
              });
            };

            return {
                registerAction: registerAction,
                registerDefaultActions: registerDefaultActions,
                resetActions: resetActions
            }
        })();
    return {
        set_expand_cb: function (callBack) {
            expand_cb = callBack;
        },
        get_expand_cb: function () {
            return expand_cb
        },
        set_contract_cb: function (callBack) {
            contract_cb = callBack;
        },
        set_switch_content_cb: function (callBack) {
            switch_content_cb = callBack;
        },
        select_item: select_item,
        hash_change: hash_change,
        openSubPanel: openSubPanel,
        updateResult: updateResult,
        closeSubPanel: closeSubPanel,
        closePanel: closePanel,
        panelResize: panelResize,
        panelAjax: panelAjax,
        control_bbq: control_bbq,
        registerPanel: registerPanel,
        actions: actions
    };
})(jQuery);

KT.panel.list = (function () {
    var total_items_count = 0,
        current_items_count = 0,
        results_items_count = 0,
        retrievingNewContent = false,
        extended_cb = function () {},
        
        update_counts = function (current, total, results, clear) {
            if (clear) {
                current_items_count = current;
                total_items_count = total;
                results_items_count = results;
            }
            else {
                current_items_count += current;
                total_items_count += total;
                results_items_count = results;
            }
            $('#total_items_count').html(total_items_count);
            $('#current_items_count').html(current_items_count);
            $('#total_results_count').html(results_items_count);
        },
        last_child = function () {
            return $("#list section").children().last();
        },
        first_child = function () {
            return $("#list section").children().first();
        },
        add = function (html) {
            $('#list section').prepend($(html).hide().fadeIn(function () {
                $(this).addClass("add", 250, function () {
                    $(this).removeClass("add", 250);
                });
            }));
            return false;
        },
        remove = function (id) {
            $('#' + id).fadeOut(function () {
                $(this).empty().remove();
                update_counts(-1, -1, -1);
            });
            return false;
        },
        refresh = function (id, url, success_cb) {
            var jQid = $('#' + id);
            $.ajax({
                cache: 'false',
                type: 'GET',
                url: url,
                dataType: 'html',
                success: function (data) {
                    notices.checkNotices();
                    jQid.html(data);
                    // obtain the value from column_1 and place it in pane_heading
                    $('.pane_heading').html(jQid.children('div:first').html());
                    if (success_cb) {
                        success_cb();
                    }
                }
            });
            return false;
        },
        extend = function () { //If we are scrolling past the bottom, we need to request more data
            var list = $('#list'),
                offset = list.find(".block").size(),
                page_size = list.attr("data-page_size"),
                url = list.attr("data-scroll_url"),
                search = KT.common.getSearchParams(),
                params = {
                    "offset": offset
                };
            if (list.hasClass("ajaxScroll") && !retrievingNewContent && KT.common.scrollTop() >= ($(document).height() - $(window).height()) - 700) {
                retrievingNewContent = true;
                if (parseInt(page_size) > parseInt(offset)) {
                    return; //If we have fewer items than the pagesize, don't try to fetch anything else
                }
                if (search) {
                    $.extend(params, search);
                }
                $(".expand_list").append('<div class="list-spinner"> <img src="/katello/images/spinner.gif" class="ajax_scroll">  </div>');
                $.ajax({
                    type: "GET",
                    url: url,
                    data: params,
                    cache: false,
                    success: function (data) {
                        var expand_list = $('.expand_list').find('section');
                        if (expand_list.length == 0) {
                            expand_list = $('.expand_list');
                        }
                        retrievingNewContent = false;
                        expand_list.append(data['html']);
                        $('.list-spinner').remove();
                        if (data['current_items'] === 0) {
                            list.removeClass("ajaxScroll");
                        }
                        update_counts(data['current_items'], 0);
                        extended_cb();
                    },
                    error: function () {
                        $('.list-spinner').remove();
                        retrievingNewContent = false;
                    }
                });
            }
        },
        registerPage = function (resource_type, options) {
            options = options || {};
            
            setupSearch(resource_type, options);
            KT.search.enableAutoComplete(KT.routes['auto_complete_search_' + resource_type + '_path']());
            KT.panel.control_bbq = false;
            
            $(window).bind('hashchange', KT.panel.hash_change);
            $(document).ready(function () {
                if (options['extra_params']) {
                    for (var i = 0; i < options['extra_params'].length; i += 1) {
                        options['extra_params'][i]['init_func']();
                    }
                }
                $(window).trigger('hashchange', [true]);
            });
            
            if (options['create']) {
                $('#' + options['create']).live('submit', function (e) {
                    var button = $(this).find('input[type|="submit"]'),
                        data = KT.common.getSearchParams() || {};
                        
                    e.preventDefault();
                    button.attr("disabled", "disabled");
                    
                    $(this).ajaxSubmit({
                        url: KT.routes[resource_type + '_path'](),
                        data: data,
                        success: createSuccess,
                        error: function (e) {
                            button.removeAttr('disabled');
                            notices.checkNotices();
                        }
                    });
                });
            }
        },
        createSuccess = function(data){
        	var id;
                            
            if (data['no_match']) {
                KT.panel.closePanel($('#panel'));
                notices.checkNotices();
                update_counts(0, 0, 1);
            }
            else {
                add(data);
                KT.panel.closePanel($('#panel'));
                id = first_child().attr("id");
                $.bbq.pushState({
                    panel: id
                });
                KT.panel.select_item(id);
                notices.checkNotices();
                update_counts(1, 1, 1);
            }
        },
        setupSearch = function (resource_type, options) {
            $('#search_form').live('submit', function (e, page_load, search_cb) {
                var button = $('#search_button'),
                    element = $('#list'),
                    url = KT.routes['items_' + resource_type + '_path'](),
                    offset = offset || 0,
                    extra_params = options['extra_params'],
                    data = {},
                    page_load = page_load || false,
                    search_cb = search_cb ||
                function () {};
                e.preventDefault();
                button.attr("disabled", "disabled");
                element.find('section').empty();
                element.find('.spinner').show();
                if ($(this).serialize() !== 'search=') {
                    $.bbq.pushState($(this).serialize());
                }
                url += '?offset=' + offset;
                if (extra_params) {
                    for (var i = 0; i < extra_params.length; i += 1) {
                        data[extra_params[i]['hash_id']] = $.bbq.getState(extra_params[i]['hash_id']);
                    }
                }
                if (!page_load) {
                    KT.panel.closePanel();
                }
                $(this).ajaxSubmit({
                    url: url,
                    data: data,
                    success: function (data) {
                        element.find('section').append(data['html']);
                        element.find('.spinner').hide();
                        button.removeAttr('disabled');
                        element.find('section').fadeIn();
                        update_counts(data['current_items'], data['total_items'], data['results_count'], true);
                        $('.left').resize();
                        $('.ui-autocomplete').hide();
                        $('#list').addClass("ajaxScroll");
                        search_cb();
                    },
                    error: function (e) {
                        button.removeAttr('disabled');
                    }
                })
            });
        };
    return {
        set_extended_cb	: function (callBack) { extended_cb = callBack; },
        extend			: extend,
        registerPage	: registerPage,
        createSuccess	: createSuccess,
        remove			: remove,
        refresh			: refresh,
        add				: add
    };
})();