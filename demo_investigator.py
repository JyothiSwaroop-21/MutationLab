
import json

from app.runner import run_mutation_tests
from app.investigator import investigate_survivors


source_code = """
def calculate_discount(price, discount):
    return price - (price * discount / 100)
"""


test_code = """
from subject import calculate_discount


def test_discount():
    result = calculate_discount(100, 10)
    assert result > 0
"""


experiment = run_mutation_tests(
    source_code,
    test_code
)

investigation = investigate_survivors(experiment)

print("\\n===== MUTATIONLAB SURVIVOR INVESTIGATION =====")

print(json.dumps(investigation, indent=4))
