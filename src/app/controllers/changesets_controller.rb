#
# Copyright 2011 Red Hat, Inc.
#
# This software is licensed to you under the GNU General Public
# License as published by the Free Software Foundation; either version
# 2 of the License (GPLv2) or (at your option) any later version.
# There is NO WARRANTY for this software, express or implied,
# including the implied warranties of MERCHANTABILITY,
# NON-INFRINGEMENT, or FITNESS FOR A PARTICULAR PURPOSE. You should
# have received a copy of GPLv2 along with this software; if not, see
# http://www.gnu.org/licenses/old-licenses/gpl-2.0.txt.

class ChangesetsController < ApplicationController
  include AutoCompleteSearch
  include BreadcrumbHelper
  include ChangesetBreadcrumbs

  skip_before_filter :authorize # want to load environment if we can
  before_filter :find_changeset, :except => [:index, :items, :list, :create, :new, :auto_complete_search]
  before_filter :find_environment, :except => [:auto_complete_search]
  before_filter :authorize
  before_filter :setup_options, :only => [:index, :items, :auto_complete_search]


  after_filter :update_editors, :only => [:update]

  #around_filter :catch_exceptions


  def rules
    read_perm = lambda{@environment.changesets_readable?}
    manage_perm = lambda{@environment.changesets_manageable?}
    update_perm =  lambda {@environment.changesets_manageable? && update_artifacts_valid?}
    promote_perm = lambda{@environment.changesets_promotable?}
    {
      :index => read_perm,
      :items => read_perm,
      :list => read_perm,
      :show => read_perm,
      :new => manage_perm,
      :create => manage_perm,
      :edit => read_perm,
      :update => update_perm,
      :destroy =>manage_perm,
      :products => read_perm,
      :dependencies => read_perm,
      :object => read_perm,
      :auto_complete_search => read_perm,
      :promote => promote_perm,
      :promotion_progress => read_perm
    }
  end




  ####
  # Changeset history methods
  ####

  #changeset history index
  def index
    accessible_envs = KTEnvironment.changesets_readable(current_organization)
    setup_environment_selector(current_organization, accessible_envs)
    render :index, :locals=>{:accessible_envs => accessible_envs}
  end

  #extended scroll for changeset_history
  def items
    render_panel_items(@environment.changeset_history, @panel_options, params[:search], params[:offset])
  end

  #similar to index, but only renders the actual list of the 2 pane
  def list
    @changesets = @environment.changeset_history.search_for(params[:search]).limit(current_user.page_size)
    @columns = ['name'] #from index
    render :partial=>"list", :locals=>{:name=>controller_display_name}
  end

  def edit
    render :partial=>"edit", :layout => "tupane_layout", :locals=>{:editable=>@environment.changesets_manageable?, :name=>controller_display_name}
  end

  #list item
  def show
    render :partial=>"common/list_update", :locals=>{:item=>@changeset, :accessor=>"id", :columns=>['name']}
  end

  def section_id
    'contents'
  end



  ####
  # Promotion methods
  ####

  def dependencies
    to_ret = {}
    @changeset.calc_dependencies.each do |dependency|
      to_ret[dependency.product_id] ||= []
      to_ret[dependency.product_id] << {:name=>dependency.display_name, :dep_of=>dependency.dependency_of}
    end

    render :json=>to_ret
  end

  def object
    render :json => simplify_changeset(@changeset), :content_type => :json
  end


  def new
    render :partial=>"new", :layout => "tupane_layout"
  end

  def create
    begin
      @changeset = Changeset.create!(:name=>params[:name], :description => params[:description],
                                     :environment_id=>@environment.id)
      notice _("Changeset '#{@changeset["name"]}' was created.")
      bc = {}
      add_crumb_node!(bc, changeset_bc_id(@changeset), '', @changeset.name, ['changesets'],
                      {:client_render => true}, {:is_new=>true})
      render :json => {
        'breadcrumb' => bc,
        'id' => @changeset.id,
        'changeset' => simplify_changeset(@changeset)
      }
    rescue Exception => error
      Rails.logger.error error.to_s
      errors error
      render :json=>error, :status=>:bad_request
    end
  end

  def update
    send_changeset = params[:timestamp] && params[:timestamp] != @changeset.updated_at.to_i.to_s

    #if you are just updating the name, set it and return the new name
    if params[:name]
      @changeset.name = params[:name]
      @changeset.save!
      
      if not Changeset.where(:id => @changeset.id).search_for(params[:search]).include?(@changeset)
        notice _("'#{@changeset["name"]}' no longer matches the current search criteria."), { :level => 'message', :synchronous_request => false }
      end
      
      render :json=>{:name=> params[:name], :timestamp => @changeset.updated_at.to_i.to_s} and return
    end

    if params[:description]
      @changeset.description = params[:description]
      @changeset.save!
      
      if not Changeset.where(:id => @changeset.id).search_for(params[:search]).include?(@changeset)
        notice _("'#{@changeset["name"]}' no longer matches the current search criteria."), { :level => 'message', :synchronous_request => false }
      end
      
      render :json=>{:description=> params[:description], :timestamp => @changeset.updated_at.to_i.to_s} and return
    end

    if params[:state]
      raise _('Invalid state') if !["review", "new"].index(params[:state])
      if send_changeset
        to_ret = {}
        to_ret[:changeset] = simplify_changeset(@changeset) if send_changeset
        render :json=>to_ret, :status=>:bad_request and return
      end
      @changeset.state = Changeset::REVIEW if params[:state] == "review"
      @changeset.state = Changeset::NEW if params[:state] == "new"
      @changeset.save!
      render :json=>{:timestamp=>@changeset.updated_at.to_i.to_s} and return
    end

    render :text => "The changeset is currently under review, no modifications can occur during this phase.",
           :status => :bad_request if @changeset.state == Changeset::REVIEW
    render :text => "This changeset is already promoted, no content modifications can be made.",
               :status => :bad_request if @changeset.state == Changeset::PROMOTED

    if params.has_key? :data
      params[:data].each do |item|
        adding = item["adding"]
        type = item["type"]
        id = item["item_id"] #id of item being added/removed
        name = item["item_name"] #display of item being added/removed
        pid = item["product_id"]
        case type
          when "template"
            @changeset.system_templates << SystemTemplate.where(:id => id) if adding
            @changeset.system_templates.delete SystemTemplate.find(id) if !adding
          when "product"
            @changeset.products << Product.where(:id => id) if adding
            @changeset.products.delete Product.find(id) if !adding
          when "errata"
            @changeset.errata << ChangesetErratum.new(:errata_id=>id, :display_name=>name,
                                                :product_id => pid, :changeset => @changeset) if adding
            ChangesetErrata.destroy_all(:errata_id =>id, :changeset_id => @changeset.id) if !adding
          when "package"
            @changeset.packages << ChangesetPackage.new(:package_id=>id, :display_name=>name, :product_id => pid,
                                                :changeset => @changeset) if adding
            ChangesetPackage.destroy_all(:package_id =>id, :changeset_id => @changeset.id) if !adding

          when "repo"
              @changeset.repos << Repository.find(id) if adding
              @changeset.repos.delete(Repository.find(id)) if !adding

          when "distribution"
              @changeset.distributions << ChangesetDistribution.new(:distribution_id=>id, :display_name=>name, :product_id => pid, :changeset => @changeset) if adding
              ChangesetDistribution.destroy_all(:distribution_id =>id, :changeset_id => @changeset.id) if !adding

        end
      end
      @changeset.updated_at = Time.now
      @changeset.save!
      csu = ChangesetUser.find_or_create_by_user_id_and_changeset_id(current_user.id, @changeset.id)
      csu.save!

    end
    to_ret = {:timestamp=>@changeset.updated_at.to_i.to_s}
    to_ret[:changeset] = simplify_changeset(@changeset) if send_changeset
    render :json=>to_ret
  end

  def destroy
    name = @changeset.name
    id = @changeset.id
    @changeset.destroy
    notice _("Changeset '#{name}' was deleted.")
    render :text=>""
  end

  def promote
    begin
      @changeset.promote
      # remove user edit tracking for this changeset
      ChangesetUser.destroy_all(:changeset_id => @changeset.id)
      notice _("Started promotion of '#{@changeset.name}' to #{@environment.name} environment")
    rescue Exception => e
        errors  "Failed to promote: #{e.to_s}"
        render :text=>e.to_s, :status=>500
        return
    end

    render :text=>url_for(:controller=>"promotions", :action => "show",
          :env_id => @environment.name, :org_id =>  @environment.organization.cp_key)
  end

  def promotion_progress
    progress = @changeset.task_status.progress
    to_ret = {'id' => 'changeset_' + @changeset.id.to_s, 'progress' => progress.to_i}
    render :json=>to_ret
  end


  private

  def find_environment
    if @changeset
      @environment = @changeset.environment
    elsif params[:env_id]
      @environment = KTEnvironment.find(params[:env_id])
    else
      #didnt' find an environment, just do the first the user has access to
      list = KTEnvironment.changesets_readable(current_organization).where(:locker=>false)
      @environment ||= list.first || current_organization.locker
    end
  end

  def update_editors
    usernames = @changeset.users.collect { |c| User.where(:id => c.user_id ).order("updated_at desc")[0].username }
    usernames.delete(current_user.username)
    response.headers['X-ChangesetUsers'] = usernames.to_json
  end

  def find_changeset
    begin
      @changeset = Changeset.find(params[:id])
    rescue Exception => error
      errors error.to_s
      execute_after_filters
      render :text=>error.to_s, :status=>:bad_request
    end
  end

  def setup_options
    @panel_options = { :title => _('Changesets'),
                 :col => ['name'],
                 :enable_create => false,
                 :name => controller_display_name,
                 :accessor => :id,
                 :ajax_load => true,
                 :ajax_scroll => items_changesets_path()}
  end


  def controller_display_name
    return _('changeset')
  end

  private

  #produce a simple datastructure of a changeset for the browser
  def simplify_changeset cs

    to_ret = {:id=>cs.id.to_s, :name=>cs.name, :description=>cs.description, :timestamp =>cs.updated_at.to_i.to_s,
                          :system_templates => {},:products=>{}, :is_new => cs.state == Changeset::NEW}
    cs.system_templates.each do |temp|
      to_ret[:system_templates][temp.id] = {:id=> temp.id, :name=>temp.name}
    end

    cs.involved_products.each{|product|
      to_ret[:products][product.id] = {:id=> product.id, :name=>product.name, :provider=>product.provider.provider_type,
                                       'package'=>[], 'errata'=>[], 'repo'=>[], 'distribution'=>[]}
    }

    cs.products.each {|product|
      to_ret[:products][product.id][:all] =  true
    }

    ['repo', 'errata', 'package', 'distribution'].each{ |type|
      cs.send(type.pluralize).each{|item|
        p item
        pid = item.product_id
        cs_product = to_ret[:products][pid]
        cs_product[type] << {:id=>item.send("#{type}_id"), :name=>item.display_name}
      }
    }
    to_ret
  end

  def update_artifacts_valid?
    if params.has_key? :data
      params[:data].each do |item|
        type = item["type"]
        id = item["item_id"]
        pid = item["product_id"]
        item = nil
        case type
          when "template"
            item = SystemTemplate.find(id)
          when "product"
            item = Product.find(id)

          when "errata"
            item = Product.find(pid)
          when "package"
            item = Product.find(pid)
          when "repo"
            item = Product.find(pid)
          when "distribution"
            item = Product.find(pid)
        end
        unless item && item.readable?()
          return false
        end
      end
    end
    true
  end



end