\# MutationLab 🧬



\*\*AI-Powered Python Mutation Testing Laboratory\*\*



MutationLab is an AI-assisted mutation testing platform that helps developers evaluate the effectiveness of their Python test suites.



It generates code mutations, executes tests in an isolated Docker environment, identifies surviving mutants, and uses Google's Gemini AI to recommend stronger tests.



\## ✨ Features



\- \*\*Python Code Analysis\*\* — Analyze Python source code.

\- \*\*Mutation Generation\*\* — Generate mutations by changing operators.

\- \*\*Automated Test Execution\*\* — Execute pytest test suites.

\- \*\*Mutation Score\*\* — Measure test effectiveness.

\- \*\*Docker Sandbox\*\* — Run test experiments with resource and permission restrictions.

\- \*\*AI Investigation\*\* — Use Gemini to investigate surviving mutations.

\- \*\*AI Test Generation\*\* — Generate stronger pytest tests.

\- \*\*Test Verification\*\* — Verify generated tests against original and mutated code.

\- \*\*Interactive Dashboard\*\* — Visualize results through a React interface.



\## 🛠️ Tech Stack



| Technology | Purpose |

|---|---|

| Python | Backend |

| FastAPI | REST API |

| React + TypeScript | Frontend |

| Vite | Frontend development |

| pytest | Test execution |

| Docker | Isolated execution |

| Google Gemini API | AI investigation |



\## 🏗️ Architecture



```text

MutationLab

│

├── frontend/

│   └── React + TypeScript Dashboard

│

├── app/

│   ├── analyzer.py

│   ├── mutator.py

│   ├── runner.py

│   ├── investigator.py

│   └── main.py

│

├── Dockerfile.sandbox

├── .dockerignore

├── .gitignore

└── README.md

```



\## 🚀 Getting Started



\### Prerequisites



\- Python 3.12+

\- Node.js and npm

\- Docker Desktop

\- Google Gemini API key



\### Backend Setup



```cmd

python -m venv .venv

.venv\\Scripts\\activate

pip install -r requirements.txt

```



Create a `.env` file in the project root:



```env

GEMINI\_API\_KEY=your\_api\_key\_here

```



Start the backend:



```cmd

uvicorn app.main:app --reload

```



API documentation:



http://127.0.0.1:8000/docs



\### Frontend Setup



Open another terminal:



```cmd

cd frontend

npm install

npm run dev

```



Open:



http://localhost:5173



\## 🧪 Example Experiment



Consider this Python function:



```python

def calculate\_discount(price, discount):

&#x20;   return price - (price \* discount / 100)

```



A weak test might only check whether the result is positive:



```python

def test\_discount():

&#x20;   assert calculate\_discount(100, 10) > 0

```



MutationLab can identify that this test is insufficient and recommend a stronger assertion:



```python

def test\_discount\_exact\_value():

&#x20;   assert calculate\_discount(100, 10) == 90.0

```



\## 📊 Demonstration Results



An example experiment produced:



| Metric | Result |

|---|---:|

| Total Mutants | 3 |

| Killed | 1 |

| Survived | 2 |

| Mutation Score | 33.33% |

| AI-generated tests verified | 2/2 |



The generated tests successfully passed against the original code and detected their corresponding mutations.



\## 🔐 Security Notes



MutationLab uses Docker restrictions including disabled networking, read-only root filesystem, dropped capabilities, and resource limits.



These restrictions provide isolation but are not a guarantee of complete security. Do not expose the execution API publicly or run untrusted code in production without additional security hardening.



Keep API keys in environment variables and never commit `.env` files.



\## 🎯 Project Goal



MutationLab aims to help developers discover weaknesses in their test suites and improve software reliability through mutation testing and AI-assisted test generation.



\## 👨‍💻 Author



\*\*Swaroop\*\*



Built as a developer-focused AI and software testing project.



\---



\*MutationLab — Don't just test your code. Test your tests.\*

