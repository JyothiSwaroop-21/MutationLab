import ast
import re
import subprocess
import tempfile
import uuid
from pathlib import Path

from app.ai_client import generate_ai_response

DOCKER_IMAGE = "mutationlab-sandbox:1.0"
EXECUTION_TIMEOUT = 20


def run_student_code(source_code: str) -> dict:
    container_name = f"mutationlab-learning-{uuid.uuid4().hex[:12]}"

    with tempfile.TemporaryDirectory(prefix="mutationlab-learning-") as temp_dir:
        project_path = Path(temp_dir)
        source_file = project_path / "student.py"
        source_file.write_text(source_code, encoding="utf-8")

        command = [
            "docker", "run", "--rm",
            "--name", container_name,
            "--network", "none",
            "--read-only",
            "--cap-drop", "ALL",
            "--security-opt", "no-new-privileges",
            "--memory", "256m",
            "--memory-swap", "256m",
            "--cpus", "0.5",
            "--pids-limit", "64",
            "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
            "--mount",
            f"type=bind,source={project_path.resolve()},target=/workspace,readonly",
            "--workdir", "/workspace",
            "--env", "PYTHONDONTWRITEBYTECODE=1",
            DOCKER_IMAGE,
            "python", "-I", "student.py",
        ]

        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=EXECUTION_TIMEOUT,
            )

            if result.returncode == 0:
                return {
                    "status": "success",
                    "output": result.stdout[-3000:],
                    "error": "",
                    "return_code": 0,
                }

            stderr = result.stderr[-3000:]

            # A genuine Python exception should contain a traceback.
            if "Traceback (most recent call last)" not in stderr:
                return {
                    "status": "sandbox_error",
                    "output": result.stdout[-3000:],
                    "error": stderr or "Docker could not execute the program.",
                    "return_code": result.returncode,
                }

            return {
                "status": "runtime_error",
                "output": result.stdout[-3000:],
                "error": stderr,
                "return_code": result.returncode,
            }

        except subprocess.TimeoutExpired:
            subprocess.run(
                ["docker", "rm", "-f", container_name],
                capture_output=True,
                text=True,
                timeout=10,
            )

            return {
                "status": "timeout",
                "output": "",
                "error": f"Your program exceeded the {EXECUTION_TIMEOUT}-second time limit.",
                "return_code": None,
            }

        except FileNotFoundError:
            return {
                "status": "sandbox_error",
                "output": "",
                "error": "Docker CLI was not found.",
                "return_code": None,
            }


def detect_error(source_code: str, mode: str = "guided") -> dict:
    if not source_code.strip():
        return {
            "success": False,
            "message": "Please enter some Python code.",
        }

    if mode not in ("guided", "solution"):
        mode = "guided"

    try:
        ast.parse(source_code)

    except SyntaxError as error:
        error_details = {
            "type": "SyntaxError",
            "message": error.msg,
            "line": error.lineno,
            "column": error.offset,
        }
        execution = None

    else:
        execution = run_student_code(source_code)

        if execution["status"] == "sandbox_error":
            return {
                "success": False,
                "status": "sandbox_error",
                "message": "The code execution environment is unavailable.",
                "error": execution["error"],
            }

        if execution["status"] == "success":
            return {
                "success": True,
                "status": "success",
                "output": execution["output"],
                "message": "Your code ran successfully!",
            }

        if execution["status"] == "timeout":
            error_details = {
                "type": "TimeoutError",
                "message": execution["error"],
                "line": None,
                "column": None,
            }

        else:
            traceback_text = execution["error"]

            line_matches = re.findall(
                r'File ".*student\.py", line (\d+)',
                traceback_text,
            )
            line_number = int(line_matches[-1]) if line_matches else None

            exception_lines = re.findall(
                r"^([A-Za-z_][A-Za-z0-9_.]*):\s*(.*)$",
                traceback_text,
                re.MULTILINE,
            )

            if exception_lines:
                exception_type, exception_message = exception_lines[-1]
            else:
                exception_type = "RuntimeError"
                exception_message = "Python encountered a runtime error."

            error_details = {
                "type": exception_type,
                "message": exception_message,
                "line": line_number,
                "column": None,
            }

    prompt = f"""
You are MutationLab, a friendly Python tutor for complete beginners.

Analyze this student's Python code and error.

STUDENT CODE:
{source_code}

ERROR DETAILS:
{error_details}

LEARNING MODE: {mode}

Respond in simple beginner-friendly language.

Return these sections:

ERROR:
Name the actual error.

WHAT HAPPENED:
Explain what went wrong.

WHY IT HAPPENED:
Explain the underlying Python concept.

{"HINT:" if mode == "guided" else "CORRECTED CODE:"}
{"Give one useful hint. Do not reveal the complete solution." if mode == "guided" else "Show the corrected code and explain each change."}

NEXT STEP:
Give the student one small thing to try.

Do not invent line numbers or claim certainty when the evidence is insufficient.
"""

    try:
        explanation = generate_ai_response(prompt)

    except Exception as error:
        return {
            "success": False,
            "status": "ai_error",
            "error": error_details,
            "message": f"AI explanation unavailable: {str(error)}",
        }

    return {
        "success": True,
        "status": "error_detected",
        "error": error_details,
        "execution": execution,
        "explanation": explanation,
        "mode": mode,
    }