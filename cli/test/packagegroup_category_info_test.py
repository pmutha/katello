import unittest
from mock import Mock
import urlparse
from cli_test_utils import CLIOptionTestCase, CLIActionTestCase
import test_data

import katello.client.core.packagegroup
from katello.client.core.packagegroup import CategoryInfo

class RequiredCLIOptionsTests(CLIOptionTestCase):

    action = CategoryInfo()

    disallowed_options = [
        (),
        ('--repo_id=123', ),
        ('--id=123', ),
    ]

    allowed_options = [
        ('--repo_id=123','--id=123'),
    ]


class PackageGroupCategoryInfoTest(CLIActionTestCase):

    REPO = test_data.REPOS[0]
    PACKAGE_GROUP_CATEGORY = test_data.PACKAGE_GROUP_CATEGORIES[0]

    OPTIONS = {
        'repo_id': REPO['id'],
        'id': PACKAGE_GROUP_CATEGORY['id'],
    }

    def setUp(self):
        self.set_action(CategoryInfo())
        self.set_module(katello.client.core.packagegroup)

        self.mock_options(self.OPTIONS)
        self.mock_printer()

        self.mock(self.action.api, 'packagegroupcategory_by_id',
            self.PACKAGE_GROUP_CATEGORY)

    def tearDown(self):
        self.restore_mocks()

    def test_it_finds_package_groups_by_id(self):
        self.mock_options(self.OPTIONS)
        self.run_action()
        self.action.api.packagegroupcategory_by_id.assert_called_once_with(self.REPO['id'], self.PACKAGE_GROUP_CATEGORY['id'])

    def test_it_prints_package_groups(self):
        self.run_action()
        self.action.printer.print_item.assert_called_once_with(self.PACKAGE_GROUP_CATEGORY)
