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

class DashboardController < ApplicationController

  skip_before_filter :authorize,:require_org

  def index
  end

  def section_id
    'dashboard'
  end


  def sync
    render :partial=>"sync"
  end

  def errata
    render :partial=>"errata"
  end

  def promotions
    render :partial=>"promotions"
  end

  def systems
    render :partial=>"systems"
  end

  def subscriptions
    render :partial=>"subscriptions"
  end

  def notices
    render :partial=>"notices"
  end


  
end