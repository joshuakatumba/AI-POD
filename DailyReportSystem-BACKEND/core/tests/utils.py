from unittest.mock import patch, PropertyMock
from contextlib import contextmanager

class MockAuthMixin:
    """
    Mixin to easily mock the request.auth dictionary in DRF views.
    """
    @contextmanager
    def mock_auth(self, payload):
        """
        Usage: 
        with self.mock_auth({"membership_id": 123}):
            response = self.client.post(...)
        """
        # We patch the 'auth' property on the DRF Request class
        path = 'rest_framework.request.Request.auth'
        with patch(path, new_callable=PropertyMock) as mocked:
            mocked.return_value = payload
            yield mocked