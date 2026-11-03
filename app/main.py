
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.analyzer import analyze_python_code
from app.mutator import generate_mutants
from app.runner import run_mutation_tests, execute_test
from app.investigator import investigate_survivors
from app.learning import detect_error


app = FastAPI(
    title="MutationLab API",
    description="AI-powered Python learning and mutation testing laboratory",
    version="0.6.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# -------------------------
# REQUEST MODELS
# -------------------------

class CodeRequest(BaseModel):
    source_code: str


class ExperimentRequest(BaseModel):
    source_code: str
    test_code: str


class LearningRequest(BaseModel):
    source_code: str
    mode: str = "guided"


# -------------------------
# GENERATED TEST VERIFICATION
# -------------------------

def verify_generated_tests(source_code: str, investigation: dict) -> dict:
    """
    Verify generated tests against original and mutated source code.
    """

    mutation_data = generate_mutants(source_code)

    if not mutation_data.get("success"):
        return {
            "success": False,
            "message": "Could not generate mutants for verification.",
            "total": 0,
            "verified": 0,
            "results": [],
        }

    mutants = mutation_data.get("mutants", [])

    advice_items = investigation.get(
        "investigations",
        investigation.get("advice", []),
    )

    verification_results = []

    for advice in advice_items:
        mutant_id = advice.get("mutant_id")
        generated_test = advice.get("generated_test", "")
        validation = advice.get("test_validation", "")

        if not generated_test:
            continue

        if validation != "static_checks_passed":
            verification_results.append({
                "mutant_id": mutant_id,
                "verified": False,
                "status": "Generated test did not pass static validation.",
            })
            continue

        matching_mutant = next(
            (
                mutant
                for mutant in mutants
                if mutant.get("id") == mutant_id
            ),
            None,
        )

        if matching_mutant is None:
            verification_results.append({
                "mutant_id": mutant_id,
                "verified": False,
                "status": "Corresponding mutant was not found.",
            })
            continue

        mutated_code = matching_mutant.get("mutated_code")

        if not mutated_code:
            verification_results.append({
                "mutant_id": mutant_id,
                "verified": False,
                "status": "Mutated source code is unavailable.",
            })
            continue

        try:
            original_result = execute_test(
                source_code,
                generated_test,
            )

            mutant_result = execute_test(
                mutated_code,
                generated_test,
            )

            original_passed = (
                original_result.get("status") == "passed"
            )

            mutant_failed = (
                mutant_result.get("status") == "failed"
            )

            verified = original_passed and mutant_failed

            verification_results.append({
                "mutant_id": mutant_id,
                "verified": verified,
                "status": (
                    "Verified successfully"
                    if verified
                    else "Verification failed"
                ),
                "original_passed": original_passed,
                "mutant_failed": mutant_failed,
                "original_execution": original_result,
                "mutant_execution": mutant_result,
            })

        except Exception as error:
            verification_results.append({
                "mutant_id": mutant_id,
                "verified": False,
                "status": f"Execution error: {str(error)}",
            })

    total = len(verification_results)

    verified_count = sum(
        1 for item in verification_results
        if item["verified"]
    )

    return {
        "success": total > 0 and verified_count == total,
        "total": total,
        "verified": verified_count,
        "results": verification_results,
    }


# -------------------------
# BASIC API
# -------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to MutationLab API",
        "version": "0.6.0",
        "status": "running",
        "platform": "Python Learning Laboratory",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
    }


# -------------------------
# EXISTING MUTATION FEATURES
# -------------------------

@app.post("/analyze")
def analyze_code(request: CodeRequest):
    return analyze_python_code(request.source_code)


@app.post("/mutate")
def mutate_code(request: CodeRequest):
    return generate_mutants(request.source_code)


@app.post("/investigate")
def investigate_code(request: ExperimentRequest):

    experiment = run_mutation_tests(
        request.source_code,
        request.test_code,
    )

    if not experiment.get("success"):
        return {
            "experiment": experiment,
            "investigation": {
                "success": False,
                "ai_used": False,
                "investigations": [],
            },
            "generated_test_verification": {
                "success": False,
                "total": 0,
                "verified": 0,
                "results": [],
            },
        }

    investigation = investigate_survivors(
        experiment,
        request.source_code,
        request.test_code,
    )

    generated_test_verification = verify_generated_tests(
        request.source_code,
        investigation,
    )

    return {
        "experiment": experiment,
        "investigation": investigation,
        "generated_test_verification": generated_test_verification,
    }


# -------------------------
# NEW STUDENT LEARNING FEATURE
# -------------------------

@app.post("/debug")
def debug_code(request: LearningRequest):

    return detect_error(
        request.source_code,
        request.mode,
    )
