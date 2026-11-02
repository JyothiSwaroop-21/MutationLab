from app.ai_client import generate_ai_response

prompt = """
You are the AI assistant inside MutationLab,
a Python mutation testing platform.

Explain in simple terms:
What is mutation testing, and why is it useful?
Keep your answer under 120 words.
"""

try:
    answer = generate_ai_response(prompt)

    print("\n===== MUTATIONLAB GEMINI TEST =====\n")
    print(answer)
    print("\n===== CONNECTION SUCCESSFUL =====")

except Exception as error:
    print("\n===== GEMINI CONNECTION FAILED =====")
    print(type(error).__name__, error)