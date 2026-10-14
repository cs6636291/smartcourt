import unittest
from verify_project import backend_results

class ReportParserTests(unittest.TestCase):
    def test_logging_between_test_name_and_result_is_not_dropped(self):
        log = 'test_mail (accounts.tests.MailTest.test_mail) ... delivery failed\nok\ntest_next (accounts.tests.MailTest.test_next) ... ok\n---\nRan 2 tests\nOK'
        self.assertEqual([state for _, _, state in backend_results(log)], ['ok', 'ok'])

    def test_no_completed_outcome_is_not_marked_passed(self):
        log = 'test_mail (accounts.tests.MailTest.test_mail) ... waiting\n---'
        self.assertEqual(list(backend_results(log))[0][2], 'unknown')

if __name__ == '__main__': unittest.main()
