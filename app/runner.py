
import subprocess
import tempfile
import re
import uuid

from pathlib import Path

from app.mutator import generate_mutants


DOCKER_IMAGE = "mutationlab-sandbox:1.0"


def execute_test(code: str, test_code: str, timeout: int = 10):
    """
    Execute Python code and pytest tests inside a restricted Docker container.

    This provides stronger isolation than running untrusted Python directly
    on the Windows host. Docker is not an absolute security boundary.
    """

    container_name = f"mutationlab-test-{uuid.uuid4().hex[:12]}"

    with tempfile.TemporaryDirectory(prefix="mutationlab-") as temp_dir:

        project_path = Path(temp_dir)

        source_file = project_path / "subject.py"
        test_file = project_path / "test_subject.py"

        source_file.write_text(code, encoding="utf-8")
        test_file.write_text(test_code, encoding="utf-8")

        docker_command = [
            "docker",
            "run",
            "--rm",
            "--name", container_name,

            # Isolation
            "--network", "none",
            "--read-only",
            "--cap-drop", "ALL",
            "--security-opt", "no-new-privileges",

            # Resource limits
            "--memory", "256m",
            "--memory-swap", "256m",
            "--cpus", "0.5",
            "--pids-limit", "64",

            # Writable temporary storage
            "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",

            # Mount only the test workspace
            "--mount",
            f"type=bind,source={project_path.resolve()},target=/workspace",

            "--workdir", "/workspace",

            # Prevent unnecessary Python cache files
            "--env", "PYTHONDONTWRITEBYTECODE=1",

            DOCKER_IMAGE,

            "python",
            "-m",
            "pytest",
            "-q",
            "-p",
            "no:cacheprovider",
            "test_subject.py"
        ]

        try:
            result = subprocess.run(
                docker_command,
                capture_output=True,
                text=True,
                timeout=timeout
            )

            output = result.stdout + "\n" + result.stderr

            if result.returncode == 0:
                status = "passed"

            elif re.search(r"\b\d+ failed\b", output):
                status = "failed"

            else:
                status = "error"

            return {
                "status": status,
                "return_code": result.returncode,
                "output": output[-2000:]
            }

        except subprocess.TimeoutExpired:

            # Stop and remove the container if execution exceeds its limit.
            subprocess.run(
                ["docker", "rm", "-f", container_name],
                capture_output=True,
                text=True,
                timeout=10
            )

            return {
                "status": "timeout",
                "return_code": None,
                "output": "Test execution exceeded the time limit."
            }

        except FileNotFoundError:
            return {
                "status": "error",
                "return_code": None,
                "output": "Docker CLI was not found. Check your Docker installation."
            }


def run_mutation_tests(source_code: str, test_code: str) -> dict:
    """
    Run tests against the original code and generated mutants.
    All test executions happen inside Docker containers.
    """

    # First verify that the original code passes its tests.
    baseline = execute_test(source_code, test_code)

    if baseline["status"] != "passed":
        return {
            "success": False,
            "message": "Original code did not pass its tests.",
            "baseline": baseline,
            "results": []
        }

    # Generate arithmetic mutants.
    mutation_data = generate_mutants(source_code)

    if not mutation_data["success"]:
        return mutation_data

    results = []

    for mutant in mutation_data["mutants"]:

        execution = execute_test(
            mutant["mutated_code"],
            test_code
        )

        if execution["status"] == "failed":
            classification = "killed"

        elif execution["status"] == "passed":
            classification = "survived"

        else:
            classification = "error"

        results.append({
            "id": mutant["id"],
            "original_operator": mutant["original_operator"],
            "mutated_operator": mutant["mutated_operator"],
            "status": classification,
            "execution": execution
        })

    killed = sum(
        result["status"] == "killed"
        for result in results
    )

    survived = sum(
        result["status"] == "survived"
        for result in results
    )

    errors = sum(
        result["status"] == "error"
        for result in results
    )

    valid_mutants = killed + survived

    score = (
        (killed / valid_mutants) * 100
        if valid_mutants else 0
    )

    return {
        "success": True,
        "baseline": "passed",
        "summary": {
            "total_mutants": len(results),
            "killed": killed,
            "survived": survived,
            "errors": errors,
            "mutation_score": round(score, 2)
        },
        "results": results
    }
