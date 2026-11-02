
import ast


def analyze_python_code(source_code: str) -> dict:
    """
    Analyze Python source code and extract its structure.
    """

    try:
        tree = ast.parse(source_code)
    except SyntaxError as error:
        return {
            "success": False,
            "error": {
                "message": error.msg,
                "line": error.lineno,
                "column": error.offset
            }
        }

    functions = []
    classes = []

    class Analyzer(ast.NodeVisitor):

        def __init__(self):
            self.current_class = None

        def visit_ClassDef(self, node):
            previous_class = self.current_class
            self.current_class = node.name

            methods = []

            for child in node.body:
                if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    methods.append({
                        "name": child.name,
                        "line": child.lineno,
                        "parameters": [
                            arg.arg for arg in child.args.args
                        ]
                    })

            classes.append({
                "name": node.name,
                "line": node.lineno,
                "methods": methods
            })

            self.generic_visit(node)
            self.current_class = previous_class

        def visit_FunctionDef(self, node):
            if self.current_class is None:
                functions.append({
                    "name": node.name,
                    "line": node.lineno,
                    "parameters": [
                        arg.arg for arg in node.args.args
                    ],
                    "async": False
                })

            self.generic_visit(node)

        def visit_AsyncFunctionDef(self, node):
            if self.current_class is None:
                functions.append({
                    "name": node.name,
                    "line": node.lineno,
                    "parameters": [
                        arg.arg for arg in node.args.args
                    ],
                    "async": True
                })

            self.generic_visit(node)

    Analyzer().visit(tree)

    return {
        "success": True,
        "summary": {
            "function_count": len(functions),
            "class_count": len(classes),
            "method_count": sum(
                len(item["methods"]) for item in classes
            )
        },
        "functions": functions,
        "classes": classes
    }
