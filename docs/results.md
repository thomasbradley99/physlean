# Current Formal Results

This file records the central Lean-checked results in this repository.

## Core implication

From `CPPP/Basic.lean`:

- `reliablyEnactedIn_requires_constructor`
- `reliableEnactment_has_ready_constructor`

Interpretation:

- if a task is reliably enacted in a world, there exists an available constructor witnessing that enactment;
- moreover, that constructor has a ready configuration.

## Separation result

From `CPPP/Examples.lean`:

- `specification_does_not_entail_reliable_enactment`

Interpretation:

- a function-specified task can be specified while failing to be reliably enacted in a barren world with no available constructors.

## Why this matters

The formalized result isolates a key thesis:

- specification by map/function is one notion;
- reliable physical realization is another;
- constructor availability bridges the two.
