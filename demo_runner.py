
import json

from app.runner import run_mutation_tests


source_code = """
def calculate_discount(price, discount):
    return price - (price * discount / 100)
"""


test_code = """
from subject import calculate_discount


def test_discount():
    assert calculate_discount(100, 10) == 90
"""


results = run_mutation_tests(source_code, test_code)

print(json.dumps(results, indent=4))
