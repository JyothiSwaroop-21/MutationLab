
import json

from app.runner import run_mutation_tests


source_code = """
def calculate_discount(price, discount):
    return price - (price * discount / 100)
"""


# Intentionally weak test
test_code = """
from subject import calculate_discount


def test_discount():
    result = calculate_discount(100, 10)
    assert result > 0
"""


results = run_mutation_tests(source_code, test_code)

print("\\n===== MUTATIONLAB WEAK TEST EXPERIMENT =====\\n")

print(json.dumps(results, indent=4))

if results.get("success"):

    print("\\n===== MUTATION ANALYSIS =====")

    for mutant in results["results"]:

        print(
            f"{mutant['id']}: "
            f"{mutant['status'].upper()}"
        )

    print(
        "\\nMutation Score:",
        results["summary"]["mutation_score"],
        "%"
    )
