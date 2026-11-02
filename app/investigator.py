
import ast
import json
import re

from app.ai_client import generate_ai_response


# Rule-based fallback recommendations
RECOMMENDATIONS = {
    ("Mult", "Div"): {
        "reason": "Multiplication was replaced by division, but the existing test did not detect the incorrect calculation.",
        "suggestion": "Assert the exact expected discount amount instead of checking only whether the result is positive.",
        "example": "assert calculate_discount(100, 10) == 90"
    },
    ("Sub", "Add"): {
        "reason": "Subtraction was replaced by addition, but the existing test still accepted the result.",
        "suggestion": "Check the exact calculated result and verify that the discount reduces the original price.",
        "example": "assert calculate_discount(100, 10) == 90"
    },
    ("Div", "Mult"): {
        "reason": "Division was replaced by multiplication.",
        "suggestion": "Add tests with different discount percentages and assert their exact expected results.",
        "example": "assert calculate_discount(200, 25) == 150"
    }
}


def get_fallback_advice(mutant: dict) -> dict:
    mutation_type = (
        mutant.get("original_operator"),
        mutant.get("mutated_operator")
    )

    return RECOMMENDATIONS.get(
        mutation_type,
        {
            "reason": "The mutant survived the existing test suite.",
            "suggestion": "Add assertions that verify the exact expected behavior.",
            "example": "Add a test with an explicitly expected result."
        }
    )


def investigate_with_gemini(
    survivors: list,
    source_code: str,
    test_code: str
) -> list:
    """Investigate surviving mutants using Gemini."""

    prompt = f"""
You are MutationLab's expert Python mutation-testing investigator.

ORIGINAL PYTHON SOURCE CODE:
{source_code}

EXISTING PYTEST CODE:
{test_code}

SURVIVING MUTANTS AND THEIR EXECUTION RESULTS:
{json.dumps(survivors, indent=2)}

Analyze each surviving mutant.

For every mutant:
1. Explain why the existing test failed to detect it.
2. Identify the weakness in the existing test.
3. Recommend a specific improvement.
4. Give a meaningful pytest assertion.
5. Generate a complete additional pytest test function.

IMPORTANT RULES:
- Use actual function names from the source code.
- Calculate expected values using the actual source code logic.
- Choose inputs that distinguish original and mutated behavior.
- Do not invent function names or expected values.
- Do not generate placeholder tests.
- Generated tests must contain meaningful assertions.
- Include necessary imports from subject when required.
- Do not claim generated tests were executed.
- Return one investigation for every surviving mutant.

Return ONLY valid JSON, without Markdown code fences.

Use this structure:

{{
  "investigations": [
    {{
      "mutant_id": "M001",
      "reason": "Specific explanation",
      "suggestion": "Specific improvement",
      "example": "assert calculate_discount(100, 10) == 90",
      "generated_test": "from subject import calculate_discount\\ndef test_discount_example():\\n    assert calculate_discount(100, 10) == 90"
    }}
  ]
}}
"""

    response = generate_ai_response(prompt)

    cleaned = response.strip()

    cleaned = re.sub(
        r"^```(?:json)?\s*|\s*```$",
        "",
        cleaned,
        flags=re.IGNORECASE
    )

    data = json.loads(cleaned)

    if not isinstance(data.get("investigations"), list):
        raise ValueError("Invalid Gemini investigation response.")

    return data["investigations"]


def is_valid_generated_test(code: str) -> bool:
    """
    Perform basic static validation of AI-generated pytest code.

    This does not prove that the test is correct or safe to execute.
    """

    if not isinstance(code, str):
        return False

    code = code.strip()

    if not code:
        return False

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return False

    test_functions = [
        node
        for node in ast.walk(tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        and node.name.startswith("test_")
    ]

    if not test_functions:
        return False

    has_assertion = any(
        isinstance(node, ast.Assert)
        for node in ast.walk(tree)
    )

    if not has_assertion:
        return False

    # Reject dangerous imports and execution functions.
    forbidden_imports = {
        "subprocess",
        "socket",
        "ctypes",
        "multiprocessing"
    }

    for node in ast.walk(tree):

        if isinstance(node, ast.Import):
            for alias in node.names:
                root_module = alias.name.split(".")[0]

                if root_module in forbidden_imports:
                    return False

        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root_module = node.module.split(".")[0]

                if root_module in forbidden_imports:
                    return False

        elif isinstance(node, ast.Call):

            if isinstance(node.func, ast.Name):
                if node.func.id in {
                    "exec",
                    "eval",
                    "compile",
                    "__import__"
                }:
                    return False

            elif isinstance(node.func, ast.Attribute):
                if (
                    isinstance(node.func.value, ast.Name)
                    and node.func.value.id == "os"
                    and node.func.attr in {
                        "system",
                        "popen",
                        "execv",
                        "spawn"
                    }
                ):
                    return False

    return True


def investigate_survivors(
    experiment_results: dict,
    source_code: str = "",
    test_code: str = ""
) -> dict:
    """Investigate survivors with Gemini and rule-based fallback."""

    if not experiment_results.get("success"):
        return {
            "success": False,
            "message": "Cannot investigate an unsuccessful experiment."
        }

    survivors = [
        mutant
        for mutant in experiment_results.get("results", [])
        if mutant.get("status") == "survived"
    ]

    if not survivors:
        return {
            "success": True,
            "survivors_found": 0,
            "investigations": [],
            "recommendation_count": 0,
            "ai_used": False,
            "message": "All mutants were killed."
        }

    investigations = []
    ai_used = False
    ai_error = None

    ai_by_id = {}

    try:
        if not source_code or not test_code:
            raise ValueError(
                "Source code and test code are required."
            )

        ai_results = investigate_with_gemini(
            survivors,
            source_code,
            test_code
        )

        ai_by_id = {
            str(item.get("mutant_id")): item
            for item in ai_results
            if isinstance(item, dict)
        }

    except Exception as error:
        ai_error = f"{type(error).__name__}: {error}"

    for mutant in survivors:

        mutant_id = str(mutant.get("id"))
        ai_advice = ai_by_id.get(mutant_id)

        required_fields = (
            "reason",
            "suggestion",
            "example"
        )

        valid_advice = (
            isinstance(ai_advice, dict)
            and all(
                isinstance(ai_advice.get(field), str)
                and ai_advice[field].strip()
                for field in required_fields
            )
        )

        if valid_advice:

            advice = {
                "reason": ai_advice["reason"],
                "suggestion": ai_advice["suggestion"],
                "example": ai_advice["example"]
            }

            generated_test = ai_advice.get(
                "generated_test",
                ""
            )

            if is_valid_generated_test(generated_test):
                advice["generated_test"] = generated_test
                advice["test_validation"] = "static_checks_passed"

            else:
                advice["generated_test"] = ""
                advice["test_validation"] = "static_checks_failed"

            ai_used = True

        else:
            advice = get_fallback_advice(mutant)
            advice["generated_test"] = ""
            advice["test_validation"] = "not_generated"
            advice["source"] = "rule_based_fallback"

        investigations.append({
            "mutant_id": mutant.get("id"),
            "status": "survived",
            "mutation": (
                f"{mutant.get('original_operator')} -> "
                f"{mutant.get('mutated_operator')}"
            ),
            **advice
        })

    result = {
        "success": True,
        "survivors_found": len(investigations),
        "investigations": investigations,
        "recommendation_count": len(investigations),
        "ai_used": ai_used
    }

    if ai_error:
        result["ai_error"] = ai_error

    return result
