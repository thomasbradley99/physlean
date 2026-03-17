"""Minimal constructor-style graph rewrite demo.

This script builds a tiny graph world in which:

- a constructor is an in-world node of kind ``C``,
- its code is stored in attached in-world program nodes of kind ``P``,
- the outer engine only performs generic interpretation,
- the specific local rewrite depends on the constructor's internal code.

The output is a set of SVG frames plus a side-by-side final comparison under
``demo-constructor-code/outputs`` by default.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from html import escape
from math import cos, pi, sin
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Set, Tuple


NodeId = int
Edge = Tuple[NodeId, NodeId]
Match = Optional[Tuple[str, object]]


@dataclass
class Node:
    node_id: NodeId
    kind: str
    value: Optional[int] = None


@dataclass
class World:
    nodes: Dict[NodeId, Node] = field(default_factory=dict)
    edges: Set[Edge] = field(default_factory=set)
    next_id: int = 0

    def add_node(self, kind: str, value: Optional[int] = None) -> NodeId:
        nid = self.next_id
        self.nodes[nid] = Node(nid, kind, value)
        self.next_id += 1
        return nid

    def add_edge(self, a: NodeId, b: NodeId) -> None:
        if a == b:
            return
        self.edges.add(tuple(sorted((a, b))))

    def remove_node(self, nid: NodeId) -> None:
        if nid not in self.nodes:
            return
        del self.nodes[nid]
        self.edges = {edge for edge in self.edges if nid not in edge}

    def neighbors(self, nid: NodeId) -> Set[NodeId]:
        out: Set[NodeId] = set()
        for a, b in self.edges:
            if a == nid:
                out.add(b)
            elif b == nid:
                out.add(a)
        return out

    def summary(self) -> str:
        counts = {"C": 0, "P": 0, "S": 0, "R": 0}
        for node in self.nodes.values():
            counts[node.kind] = counts.get(node.kind, 0) + 1
        return (
            f"C={counts['C']} P={counts['P']} "
            f"S={counts['S']} R={counts['R']} edges={len(self.edges)}"
        )


def find_constructors(world: World) -> List[NodeId]:
    return sorted(nid for nid, node in world.nodes.items() if node.kind == "C")


def read_constructor_code(world: World, c_id: NodeId) -> List[int]:
    p_nodes = sorted(
        nid for nid in world.neighbors(c_id) if world.nodes[nid].kind == "P"
    )
    code = [world.nodes[nid].value for nid in p_nodes]
    if len(code) != 3 or any(value is None for value in code):
        raise ValueError(f"constructor {c_id} must have three valued P nodes")
    return [int(value) for value in code]


def find_match(world: World, c_id: NodeId, pattern_type: int) -> Match:
    """Return the first local pattern matched around the constructor."""

    neighbors = sorted(world.neighbors(c_id))

    if pattern_type == 0:
        for nid in neighbors:
            if world.nodes[nid].kind == "S":
                return ("node", nid)
        return None

    if pattern_type == 1:
        for nid in neighbors:
            if world.nodes[nid].kind == "R":
                return ("node", nid)
        return None

    if pattern_type == 2:
        s_neighbors = [nid for nid in neighbors if world.nodes[nid].kind == "S"]
        for index, a in enumerate(s_neighbors):
            for b in s_neighbors[index + 1 :]:
                if tuple(sorted((a, b))) in world.edges:
                    return ("pair", (a, b))
        return None

    raise ValueError(f"unknown pattern type: {pattern_type}")


def primitive_add_substrate(
    world: World, c_id: NodeId, match: Tuple[str, object], param: int
) -> Tuple[str, Set[NodeId], Set[Edge]]:
    new_s = world.add_node("S")
    changed_nodes = {new_s}
    changed_edges: Set[Edge] = set()

    if match[0] == "node":
        target = int(match[1])
        edge = tuple(sorted((new_s, target)))
        world.add_edge(new_s, target)
        changed_edges.add(edge)
    elif match[0] == "pair":
        pair = match[1]
        assert isinstance(pair, tuple)
        target = int(pair[0] if param % 2 == 0 else pair[1])
        edge = tuple(sorted((new_s, target)))
        world.add_edge(new_s, target)
        changed_edges.add(edge)

    edge = tuple(sorted((new_s, c_id)))
    world.add_edge(new_s, c_id)
    changed_edges.add(edge)
    return (f"added substrate S{new_s}", changed_nodes, changed_edges)


def primitive_remove_substrate(
    world: World, c_id: NodeId, match: Tuple[str, object], param: int
) -> Tuple[str, Set[NodeId], Set[Edge]]:
    del c_id
    if match[0] == "node":
        target = int(match[1])
    else:
        pair = match[1]
        assert isinstance(pair, tuple)
        target = int(pair[0] if param % 2 == 0 else pair[1])

    if target in world.nodes and world.nodes[target].kind == "S":
        world.remove_node(target)
        return (f"removed substrate S{target}", {target}, set())
    return ("remove substrate no-op", set(), set())


def primitive_consume_resource_make_substrate(
    world: World, c_id: NodeId, match: Tuple[str, object], param: int
) -> Tuple[str, Set[NodeId], Set[Edge]]:
    del param
    if match[0] != "node":
        return ("resource conversion no-op", set(), set())

    target = int(match[1])
    if target not in world.nodes or world.nodes[target].kind != "R":
        return ("resource conversion no-op", set(), set())

    neighbors = sorted(world.neighbors(target))
    world.remove_node(target)

    new_s = world.add_node("S")
    changed_nodes = {target, new_s}
    changed_edges: Set[Edge] = set()
    for nid in neighbors:
        if nid in world.nodes:
            edge = tuple(sorted((new_s, nid)))
            world.add_edge(new_s, nid)
            changed_edges.add(edge)
    edge = tuple(sorted((new_s, c_id)))
    world.add_edge(new_s, c_id)
    changed_edges.add(edge)
    return (
        f"converted resource R{target} into substrate S{new_s}",
        changed_nodes,
        changed_edges,
    )


PRIMITIVES = {
    0: primitive_add_substrate,
    1: primitive_remove_substrate,
    2: primitive_consume_resource_make_substrate,
}

PATTERN_LABELS = {
    0: "neighboring substrate",
    1: "neighboring resource",
    2: "connected pair of neighboring substrate nodes",
}

PRIMITIVE_LABELS = {
    0: "add substrate",
    1: "remove substrate",
    2: "convert resource to substrate",
}


@dataclass
class StepResult:
    log: str
    changed_nodes: Set[NodeId]
    changed_edges: Set[Edge]


def decode_and_apply(world: World, c_id: NodeId) -> StepResult:
    code = read_constructor_code(world, c_id)
    pattern_type, primitive_type, param = code
    match = find_match(world, c_id, pattern_type)

    if match is None:
        return StepResult(
            log=f"C{c_id} code={code} -> no {PATTERN_LABELS.get(pattern_type, 'match')}",
            changed_nodes=set(),
            changed_edges=set(),
        )

    primitive = PRIMITIVES.get(primitive_type)
    if primitive is None:
        return StepResult(
            log=f"C{c_id} code={code} -> unknown primitive {primitive_type}",
            changed_nodes=set(),
            changed_edges=set(),
        )

    result, changed_nodes, changed_edges = primitive(world, c_id, match, param)
    return StepResult(
        log=f"C{c_id} code={code} pattern={match} -> {result}",
        changed_nodes=changed_nodes,
        changed_edges=changed_edges,
    )


def step(world: World) -> List[StepResult]:
    results = []
    for c_id in find_constructors(world):
        if c_id in world.nodes:
            results.append(decode_and_apply(world, c_id))
    return results


def attach_program(world: World, c_id: NodeId, code: Sequence[int]) -> None:
    for symbol in code:
        p_id = world.add_node("P", int(symbol))
        world.add_edge(c_id, p_id)


def make_demo_world(code: Sequence[int]) -> World:
    world = World()

    c_id = world.add_node("C")
    attach_program(world, c_id, code)

    substrates = [world.add_node("S") for _ in range(4)]
    resources = [world.add_node("R") for _ in range(3)]

    for nid in substrates + resources:
        world.add_edge(c_id, nid)

    for a, b in zip(substrates, substrates[1:]):
        world.add_edge(a, b)

    return world


def node_label(node: Node) -> str:
    if node.kind == "P":
        return f"P:{node.value}"
    return node.kind


def polar_points(
    center_x: float,
    center_y: float,
    radius: float,
    start_angle: float,
    end_angle: float,
    count: int,
) -> List[Tuple[float, float]]:
    if count == 0:
        return []
    if count == 1:
        angle = (start_angle + end_angle) / 2.0
        return [(center_x + radius * cos(angle), center_y + radius * sin(angle))]

    step_size = (end_angle - start_angle) / (count - 1)
    points = []
    for idx in range(count):
        angle = start_angle + idx * step_size
        points.append((center_x + radius * cos(angle), center_y + radius * sin(angle)))
    return points


def layout_nodes(world: World, origin_x: float = 0.0) -> Dict[NodeId, Tuple[float, float]]:
    layout: Dict[NodeId, Tuple[float, float]] = {}
    center_x = origin_x + 260.0
    center_y = 240.0

    constructors = [nid for nid, node in world.nodes.items() if node.kind == "C"]
    programs = sorted(nid for nid, node in world.nodes.items() if node.kind == "P")
    substrates = sorted(nid for nid, node in world.nodes.items() if node.kind == "S")
    resources = sorted(nid for nid, node in world.nodes.items() if node.kind == "R")

    if constructors:
        layout[constructors[0]] = (center_x, center_y)

    for nid, point in zip(
        programs,
        polar_points(center_x, center_y, 150.0, -0.9 * pi, -0.1 * pi, len(programs)),
    ):
        layout[nid] = point

    for nid, point in zip(
        substrates,
        polar_points(center_x, center_y, 145.0, 0.6 * pi, 1.35 * pi, len(substrates)),
    ):
        layout[nid] = point

    for nid, point in zip(
        resources,
        polar_points(center_x, center_y, 145.0, -0.35 * pi, 0.35 * pi, len(resources)),
    ):
        layout[nid] = point

    return layout


NODE_COLORS = {
    "C": "#1f77b4",
    "P": "#f1c40f",
    "S": "#7f8c8d",
    "R": "#2ecc71",
}


def svg_line(x1: float, y1: float, x2: float, y2: float, stroke: str, width: float) -> str:
    return (
        f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
        f'stroke="{stroke}" stroke-width="{width:.1f}" stroke-linecap="round" />'
    )


def svg_circle(
    x: float,
    y: float,
    radius: float,
    fill: str,
    stroke: str = "#222222",
    width: float = 2.0,
) -> str:
    return (
        f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{radius:.1f}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{width:.1f}" />'
    )


def svg_text(
    x: float,
    y: float,
    text: str,
    size: int,
    weight: str = "normal",
    anchor: str = "middle",
    fill: str = "#111111",
) -> str:
    safe = escape(text)
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" '
        f'font-family="Menlo, Monaco, Consolas, monospace" font-weight="{weight}" '
        f'text-anchor="{anchor}" fill="{fill}">{safe}</text>'
    )


def render_world_svg(
    world: World,
    path: Path,
    title: str,
    subtitle: str,
    log_lines: Sequence[str],
    changed_nodes: Optional[Set[NodeId]] = None,
    changed_edges: Optional[Set[Edge]] = None,
    origin_x: float = 0.0,
    width: int = 520,
) -> None:
    changed_nodes = changed_nodes or set()
    changed_edges = changed_edges or set()
    layout = layout_nodes(world, origin_x=origin_x)
    parts: List[str] = []

    parts.append(svg_text(origin_x + 260, 34, title, 22, weight="bold"))
    parts.append(svg_text(origin_x + 260, 58, subtitle, 13, fill="#444444"))
    parts.append(svg_text(origin_x + 260, 82, world.summary(), 12, fill="#444444"))

    legend_y = 110
    legend_items = [("C", "constructor"), ("P", "program"), ("S", "substrate"), ("R", "resource")]
    for idx, (kind, label) in enumerate(legend_items):
        x = origin_x + 70 + idx * 110
        parts.append(svg_circle(x, legend_y, 12, NODE_COLORS[kind], width=1.5))
        parts.append(svg_text(x + 24, legend_y + 5, label, 11, anchor="start"))

    for edge in sorted(world.edges):
        a, b = edge
        if a not in layout or b not in layout:
            continue
        stroke = "#d64541" if edge in changed_edges else "#6b7280"
        width_px = 4.0 if edge in changed_edges else 2.0
        x1, y1 = layout[a]
        x2, y2 = layout[b]
        parts.append(svg_line(x1, y1, x2, y2, stroke=stroke, width=width_px))

    for nid in sorted(world.nodes):
        node = world.nodes[nid]
        x, y = layout[nid]
        highlight = nid in changed_nodes
        radius = 26 if node.kind == "C" else 20
        stroke = "#d64541" if highlight else "#222222"
        width_px = 4.0 if highlight else 2.0
        parts.append(svg_circle(x, y, radius, NODE_COLORS[node.kind], stroke=stroke, width=width_px))
        parts.append(svg_text(x, y + 5, node_label(node), 12, weight="bold"))

    trace_y = 410
    parts.append(svg_text(origin_x + 40, trace_y, "Step trace", 13, weight="bold", anchor="start"))
    for idx, line in enumerate(log_lines[-3:]):
        parts.append(svg_text(origin_x + 40, trace_y + 24 + idx * 18, line, 11, anchor="start", fill="#333333"))

    svg = "\n".join(
        [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="470" viewBox="0 0 {width} 470">',
            '<rect width="100%" height="100%" fill="#fcfcfb" />',
            *parts,
            "</svg>",
        ]
    )
    path.write_text(svg, encoding="utf-8")


def render_comparison_svg(
    world_a: World,
    world_b: World,
    path: Path,
    title_a: str,
    title_b: str,
    logs_a: Sequence[str],
    logs_b: Sequence[str],
) -> None:
    width = 1040
    left_svg = path.with_name("_left_panel.svg")
    right_svg = path.with_name("_right_panel.svg")

    render_world_svg(world_a, left_svg, title_a, "final state", logs_a, width=520)
    render_world_svg(world_b, right_svg, title_b, "final state", logs_b, width=520)

    left_body = left_svg.read_text(encoding="utf-8").split("\n", 2)[2].rsplit("</svg>", 1)[0]
    right_body = right_svg.read_text(encoding="utf-8").split("\n", 2)[2].rsplit("</svg>", 1)[0]

    combined = "\n".join(
        [
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="470" viewBox="0 0 {width} 470">',
            '<rect width="100%" height="100%" fill="#f3f4f6" />',
            '<g transform="translate(0,0)">',
            left_body,
            "</g>",
            '<g transform="translate(520,0)">',
            right_body,
            "</g>",
            "</svg>",
        ]
    )
    path.write_text(combined, encoding="utf-8")
    left_svg.unlink()
    right_svg.unlink()


def write_trace(path: Path, lines: Iterable[str]) -> None:
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_demo(name: str, code: Sequence[int], steps: int, outdir: Path) -> Tuple[World, List[str]]:
    outdir.mkdir(parents=True, exist_ok=True)
    world = make_demo_world(code)
    trace = [
        f"{name}",
        f"code={list(code)}",
        f"pattern={PATTERN_LABELS[code[0]]}",
        f"primitive={PRIMITIVE_LABELS[code[1]]}",
        f"param={code[2]}",
        "",
        f"step 0: {world.summary()}",
    ]

    render_world_svg(
        world,
        outdir / "step_0.svg",
        title=name,
        subtitle=f"step 0 | code={list(code)}",
        log_lines=["initial state"],
    )

    for step_index in range(1, steps + 1):
        results = step(world)
        step_logs = [result.log for result in results]
        changed_nodes: Set[NodeId] = set()
        changed_edges: Set[Edge] = set()
        for result in results:
            changed_nodes.update(result.changed_nodes)
            changed_edges.update(result.changed_edges)

        trace.append(f"step {step_index}: {world.summary()}")
        trace.extend(f"  {line}" for line in step_logs)

        render_world_svg(
            world,
            outdir / f"step_{step_index}.svg",
            title=name,
            subtitle=f"step {step_index} | code={list(code)}",
            log_lines=step_logs,
            changed_nodes=changed_nodes,
            changed_edges=changed_edges,
        )

    write_trace(outdir / "trace.txt", trace)
    return world, trace


def write_index(path: Path) -> None:
    html = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Constructor Demo Outputs</title>
    <style>
      body { font-family: Menlo, Monaco, Consolas, monospace; margin: 24px; background: #f5f5f4; color: #222; }
      h1, h2 { margin-bottom: 8px; }
      .grid { display: grid; grid-template-columns: repeat(2, minmax(280px, 1fr)); gap: 20px; margin-bottom: 28px; }
      .card { background: white; padding: 12px; border: 1px solid #ddd; border-radius: 10px; }
      img { width: 100%; height: auto; border: 1px solid #ddd; background: #fff; }
      code { background: #eee; padding: 2px 4px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Constructor Demo Outputs</h1>
    <p>The same interpreter runs both demos. Only the constructor's in-world code differs.</p>
    <div class="card">
      <h2>Final Comparison</h2>
      <img src="comparison_final.svg" alt="Side-by-side final comparison" />
    </div>
    <h2>Growth Constructor</h2>
    <div class="grid">
      <div class="card"><img src="growth/step_0.svg" alt="Growth step 0" /></div>
      <div class="card"><img src="growth/step_4.svg" alt="Growth step 4" /></div>
    </div>
    <h2>Pruning Constructor</h2>
    <div class="grid">
      <div class="card"><img src="pruning/step_0.svg" alt="Pruning step 0" /></div>
      <div class="card"><img src="pruning/step_4.svg" alt="Pruning step 4" /></div>
    </div>
    <p>See <code>growth/trace.txt</code> and <code>pruning/trace.txt</code> for the step-by-step interpreter trace.</p>
  </body>
</html>
"""
    path.write_text(html, encoding="utf-8")


def main() -> None:
    output_root = Path("demo-constructor-code/outputs")
    steps = 4

    growth_code = [1, 2, 0]
    pruning_code = [2, 1, 1]

    growth_world, growth_trace = run_demo(
        "Growth constructor",
        growth_code,
        steps,
        output_root / "growth",
    )
    pruning_world, pruning_trace = run_demo(
        "Pruning constructor",
        pruning_code,
        steps,
        output_root / "pruning",
    )

    render_comparison_svg(
        growth_world,
        pruning_world,
        output_root / "comparison_final.svg",
        title_a=f"Growth | code={growth_code}",
        title_b=f"Pruning | code={pruning_code}",
        logs_a=growth_trace[-4:],
        logs_b=pruning_trace[-4:],
    )
    write_index(output_root / "index.html")

    print(f"wrote demo outputs to {output_root}")
    print(f"open {output_root / 'index.html'} in a browser to inspect the comparison")


if __name__ == "__main__":
    main()
