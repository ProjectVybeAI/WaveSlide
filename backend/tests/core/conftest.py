import pytest

from tests.core.support import fingers_together


@pytest.fixture(autouse=True)
def _palm_with_fingers_together():
    with fingers_together():
        yield
