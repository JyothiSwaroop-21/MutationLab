
import ast
import copy


# Supported arithmetic mutations
OPERATOR_MUTATIONS = {
    ast.Add: ast.Sub,
    ast.Sub: ast.Add,
    ast.Mult: ast.Div,
    ast.Div: ast.Mult,
    ast.Mod: ast.Mult,
}


class MutationTransformer(ast.NodeTransformer):

    def __init__(self, target_index):
        self.target_index = target_index
        self.current_index = 0
        self.mutation = None

    def visit_BinOp(self, node):
        node = self.generic_visit(node)

        original_type = type(node.op)

        if original_type not in OPERATOR_MUTATIONS:
            return node

        current = self.current_index
        self.current_index += 1

        if current == self.target_index:
            replacement_type = OPERATOR_MUTATIONS[original_type]

            node.op = replacement_type()

            self.mutation = {
                "line": node.lineno,
                "original_operator": original_type.__name__,
                "mutated_operator": replacement_type.__name__
            }

        return node


def generate_mutants(source_code: str) -> dict:
    """Generate controlled arithmetic mutations."""

    try:
        original_tree = ast.parse(source_code)

    except SyntaxError as error:
        return {
            "success": False,
            "error": {
                "message": error.msg,
                "line": error.lineno
            }
        }

    candidates = [
        node for node in ast.walk(original_tree)
        if isinstance(node, ast.BinOp)
        and type(node.op) in OPERATOR_MUTATIONS
    ]

    mutants = []

    for index in range(len(candidates)):

        mutated_tree = copy.deepcopy(original_tree)

        transformer = MutationTransformer(index)
        mutated_tree = transformer.visit(mutated_tree)

        ast.fix_missing_locations(mutated_tree)

        if transformer.mutation is None:
            continue

        mutants.append({
            "id": f"M{len(mutants) + 1:03d}",
            **transformer.mutation,
            "mutated_code": ast.unparse(mutated_tree)
        })

    return {
        "success": True,
        "original_code": source_code,
        "total_mutations": len(mutants),
        "mutants": mutants
    }
