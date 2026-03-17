# Internalized Constructor Demo

This repository now has two layers:

- the Lean files formalize the abstract distinction between function-specification and constructor-realization;
- `demo-constructor-code/run.py` gives a tiny executable toy model where the specific local rewrite is carried by an in-world structure.

That second layer is the move you were asking for.

## What the demo shows

The demo world is a typed graph with four node kinds:

- `C`: constructor control node
- `P`: program node storing one code symbol
- `S`: substrate node
- `R`: resource node

The constructor is not a hidden Python case split. It is a real node in the world, and its code is stored in three real attached `P` nodes.

The engine only does four generic things:

- find constructor nodes,
- read their attached code,
- look for a matched local pattern,
- dispatch to one of a few generic rewrite primitives.

So the engine is fixed, but the specific local transformation depends on the in-world code.

## Code format

Each constructor carries a 3-symbol code:

```text
[pattern_type, primitive_type, param]
```

The toy alphabet is:

- `pattern_type`
  - `0`: neighboring substrate node
  - `1`: neighboring resource node
  - `2`: connected pair of neighboring substrate nodes
- `primitive_type`
  - `0`: add substrate
  - `1`: remove substrate
  - `2`: convert resource into substrate

This is intentionally tiny. The point is to show internalized specificity, not to build a full artificial life system.

## The two demos

Both demos start from the same local world shape.
Only the constructor code changes.

Growth constructor:

```text
[1, 2, 0]
```

This means:

- look for a neighboring resource,
- convert it into substrate.

Pruning constructor:

```text
[2, 1, 1]
```

This means:

- look for a connected neighboring substrate pair,
- remove one substrate node from that pair.

Same interpreter, different in-world code, different local dynamics.

## Why this is more constructor-like than ordinary rewriting

In ordinary graph or hypergraph rewriting, the specific rewrite law is usually written entirely outside the world as the modeller's rule.

Here, the specific local transformation is instead selected by an object that exists inside the world.

That does not remove every primitive. The simulator still supplies a generic meta-dynamics. But it does move the effective rewrite specificity into the substrate itself.

That is the key conceptual shift.

## Run it

From the repository root:

```bash
python3 demo-constructor-code/run.py
```

The script writes:

- `demo-constructor-code/outputs/growth/step_0.svg` through `step_4.svg`
- `demo-constructor-code/outputs/pruning/step_0.svg` through `step_4.svg`
- `demo-constructor-code/outputs/comparison_final.svg`
- `demo-constructor-code/outputs/index.html`

The simplest way to explain the result is:

> The interpreter stays fixed. Only the constructor's in-world code changes, and that changes the local effective dynamics.
