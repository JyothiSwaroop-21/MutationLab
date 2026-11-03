
import ast
import re
import subprocess
import tempfile
import uuid
from pathlib import Path

from app.ai_client import generate_ai_response


DOCKER_IMAGE = "mutationlab-sandbox:2.0"
EXECUTION_TIMEOUT = 15
MAX_SOURCE_LENGTH = 20000
MAX_OUTPUT_LENGTH = 4000

LANGUAGES = {
    "python": {
        "filename": "student.py",
        "command": ["python", "-I", "student.py"],
        "compile": None,
    },
    "javascript": {
        "filename": "student.js",
        "command": ["node", "student.js"],
        "compile": None,
    },
    "c": {
        "filename": "student.c",
        "compile": ["gcc", "student.c", "-o", "/tmp/student"],
        "command": ["/tmp/student"],
    },
    "cpp": {
        "filename": "student.cpp",
        "compile": ["g++", "student.cpp", "-o", "/tmp/student"],
        "command": ["/tmp/student"],
    },
    "java": {
        "filename": "Main.java",
        "compile": ["javac", "-d", "/tmp", "Main.java"],
        "command": ["java", "-cp", "/tmp", "Main"],
    },
}


def run_student_code(source_code: str, language: str) -> dict:
    config = LANGUAGES[language]
    container_name = f"mutationlab-learning-{uuid.uuid4().hex[:12]}"

    with tempfile.TemporaryDirectory(prefix="mutationlab-learning-") as temp_dir:
        project_path = Path(temp_dir)

        source_file = project_path / config["filename"]
        source_file.write_text(source_code, encoding="utf-8")

        base_command = [
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
            "--tmpfs", "/tmp:rw,exec,nosuid,size=64m",
            "--mount",
            f"type=bind,source={project_path.resolve()},target=/workspace,readonly",
            "--workdir", "/workspace",
            "--env", "PYTHONDONTWRITEBYTECODE=1",
            DOCKER_IMAGE,
        ]

        try:
            compile_command = config.get("compile")

            if compile_command:
                result = subprocess.run(
                    base_command + compile_command,
                    capture_output=True,
                    text=True,
                    timeout=EXECUTION_TIMEOUT,
                )

                if result.returncode != 0:
                    if not result.stderr:
                        return {
                            "status": "sandbox_error",
                            "output": result.stdout[-MAX_OUTPUT_LENGTH:],
                            "error": "The compiler could not run.",
                            "return_code": result.returncode,
                        }

                    return {
                        "status": "compile_error",
                        "output": result.stdout[-MAX_OUTPUT_LENGTH:],
                        "error": result.stderr[-MAX_OUTPUT_LENGTH:],
                        "return_code": result.returncode,
                    }

            result = subprocess.run(
                base_command + config["command"],
                capture_output=True,
                text=True,
                timeout=EXECUTION_TIMEOUT,
            )

            if result.returncode == 0:
                return {
                    "status": "success",
                    "output": result.stdout[-MAX_OUTPUT_LENGTH:],
                    "error": "",
                    "return_code": 0,
                }

            stderr = result.stderr[-MAX_OUTPUT_LENGTH:]

            if not stderr:
                return {
                    "status": "runtime_error",
                    "output": result.stdout[-MAX_OUTPUT_LENGTH:],
                    "error": "Program exited with a non-zero status.",
                    "return_code": result.returncode,
                }

            return {
                "status": "runtime_error",
                "output": result.stdout[-MAX_OUTPUT_LENGTH:],
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
                "error": f"Program exceeded the {EXECUTION_TIMEOUT}-second time limit.",
                "return_code": None,
            }

        except FileNotFoundError:
            return {
                "status": "sandbox_error",
                "output": "",
                "error": "Docker CLI was not found.",
                "return_code": None,
            }


def validate_python(source_code: str):
    try:
        ast.parse(source_code)
        return None
    except SyntaxError as error:
        return {
            "type": "SyntaxError",
            "message": error.msg,
            "line": error.lineno,
            "column": error.offset,
        }


def extract_error(execution: dict, language: str) -> dict:
    error_text = execution.get("error", "")
    error_type = "RuntimeError"
    message = error_text.strip() or "The program could not complete."
    line_number = None

    if language == "python":
        line_matches = re.findall(
            r'File ".*student\.py", line (\d+)',
            error_text,
        )

        if line_matches:
            line_number = int(line_matches[-1])

        exception_lines = re.findall(
            r"^([A-Za-z_][A-Za-z0-9_.]*):\s*(.*)$",
            error_text,
            re.MULTILINE,
        )

        if exception_lines:
            error_type, message = exception_lines[-1]

    elif language == "javascript":
        match = re.search(
            r"student\.js:(\d+)",
            error_text,
        )

        if match:
            line_number = int(match.group(1))

        exception = re.search(
            r"^([A-Za-z]+Error):\s*(.*)$",
            error_text,
            re.MULTILINE,
        )

        if exception:
            error_type, message = exception.groups()

    elif language in ("c", "cpp"):
        error_type = (
            "CompilationError"
            if execution["status"] == "compile_error"
            else "RuntimeError"
        )

        match = re.search(
            r"student\.(?:c|cpp):(\d+):\d+: error:\s*(.*)",
            error_text,
        )

        if match:
            line_number = int(match.group(1))
            message = match.group(2)

    elif language == "java":
        match = re.search(
            r"Main\.java:(\d+):",
            error_text,
        )

        if match:
            line_number = int(match.group(1))

        exception = re.search(
            r"^([A-Za-z_][A-Za-z0-9_.]*Exception|Error):?\s*(.*)$",
            error_text,
            re.MULTILINE,
        )

        if exception:
            error_type, message = exception.groups()

    if execution["status"] == "compile_error":
        error_type = "CompilationError"

    if execution["status"] == "timeout":
        error_type = "TimeoutError"

    return {
        "type": error_type,
        "message": message,
        "line": line_number,
        "column": None,
    }


def detect_error(
    source_code: str,
    mode: str = "guided",
    language: str = "python",
) -> dict:

    language = language.strip().lower()

    if language not in LANGUAGES:
        return {
            "success": False,
            "status": "unsupported_language",
            "message": (
                "Unsupported language. Choose Python, JavaScript, C, C++ or Java."
            ),
        }

    if not source_code.strip():
        return {
            "success": False,
            "message": "Please enter some code.",
        }

    if len(source_code) > MAX_SOURCE_LENGTH:
        return {
            "success": False,
            "message": "Code is too long. Maximum allowed length is 20,000 characters.",
        }

    if mode not in ("guided", "solution"):
        mode = "guided"

    if language == "python":
        syntax_error = validate_python(source_code)

        if syntax_error:
            error_details = syntax_error
            execution = None
        else:
            execution = run_student_code(source_code, language)

    else:
        execution = run_student_code(source_code, language)

    if execution is not None:
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
                "language": language,
            }

        error_details = extract_error(execution, language)

    language_names = {
        "python": "Python",
        "javascript": "JavaScript",
        "c": "C",
        "cpp": "C++",
        "java": "Java",
    }

    language_name = language_names[language]

    prompt = f"""
You are MutationLab, a friendly {language_name} programming tutor
for complete beginners.

Analyze the student's code and the reported error.

LANGUAGE: {language_name}

STUDENT CODE:
{source_code}

ERROR DETAILS:
{error_details}

LEARNING MODE: {mode}

Explain everything using beginner-friendly language.

Return these sections:

ERROR:
Name the actual error.

WHAT HAPPENED:
Explain what went wrong.

WHY IT HAPPENED:
Explain the underlying {language_name} programming concept.

{"HINT:" if mode == "guided" else "CORRECTED CODE:"}
{"Give one useful hint. Do not reveal the complete solution." if mode == "guided" else "Show the corrected code in " + language_name + " and explain each change."}

NEXT STEP:
Give the student one small thing to try.

Rules:
- Never invent line numbers.
- Preserve the student's chosen programming language.
- Do not claim that code was tested if it was not.
- If evidence is insufficient, say so.
- Do not unnecessarily rewrite the entire program.
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
        "language": language,
        "error": error_details,
        "execution": execution,
        "explanation": explanation,
        "mode": mode,
    }
