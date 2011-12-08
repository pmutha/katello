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

module Errors
  class NotFound < StandardError; end

  # unauthorized access
  class SecurityViolation < StandardError; end

  class UserNotSet < SecurityViolation; end

  class OrchestrationException < StandardError; end

  class TemplateContentException < StandardError; end

  class TemplateExportException < StandardError; end

  class ChangesetContentException < StandardError; end

  class ConflictException < StandardError; end

  class CurrentOrganizationNotFoundException < ActiveRecord::RecordNotFound; end

  class TemplateValidationException < StandardError
    attr_accessor :errors

    def initialize(msg, errors = [])
      @errors = errors
      super(msg)
    end

    def message
      if @errors.nil?
        "#{to_s}: " + _("No errors")
      else
        "#{to_s}: #{errors.join(', ')}"
      end
    end
  end
end