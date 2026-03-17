# PhysLean: Computational Physics Presupposes Constructors

This repository is a small Lean 4 project about a simple constructor-theoretic point:

- computational physics often writes evolution as an abstract update rule,
- an update rule specifies a task on states,
- but a specified task is not yet a physically enacted transformation.

The slogan is:

**Functions specify; constructors realise.**

This is a small PhysLean-style project: a Lean formalisation of a conceptual
distinction in physics.

## Core idea

In many computational formalisms, evolution is represented by a map

```text
f : State -> State
```

That map determines an input-output specification. In constructor-theoretic language, this is a **task**.

The extra question is physical:

what system enacts that transformation and remains able to do it again?

That is the role of a **constructor**.

## What is proved here

This project proves a modest but important point in the formal setting:

- a function `f : State -> State` specifies a task,
- reliable enactment of that task is a separate physical notion,
- if the task is reliably enacted in a world, then there exists an available ready constructor witnessing that enactment,
- so specification by a function alone does not entail reliable enactment.

That is the precise piece of the broader conjecture this repository tackles first.

## Why Lean

Lean lets us separate notions that are often blurred together in informal discussion:

- the existence of an abstract map,
- the task induced by that map,
- the existence of a constructor that realises the task,
- the possibility of the task in a given world.

## Repository structure

- `CPPP/Basic.lean` contains the core definitions.
- `CPPP/Examples.lean` contains simple examples and one theorem witnessing the distinction between specification and realisation.
- `demo-constructor-code/` contains the constructor demo code, explanation, and generated outputs in one place.
- `CPPP.lean` re-exports the project modules.
- `docs/note.md` is a short informal note suitable for discussion.

## CPU example

A program can define a function on data, but the output state does not become physically real merely because the function is defined. A CPU executes it.

Likewise, in computational physics, an update rule specifies the next state abstractly, but the constructor-theoretic question is what physically enacts that transformation.

## Current status

This is a minimal starting point, not a finished philosophy-of-physics formalisation. The current achievement is to formalise the hinge of the argument: the gap between abstract specification and reliable physical enactment.

## Executable toy demo

There is also a tiny dependency-free Python demo of the more concrete question:
what would it look like for specific local rewrite content to be carried by an
in-world constructor rather than only by an external rule?

Run:

```bash
python3 demo-constructor-code/run.py
```

This writes SVG frames and a side-by-side comparison under
`demo-constructor-code/outputs/`.

The point of the demo is very narrow:

- the constructor `C` exists in the graph,
- its code exists in attached `P` nodes,
- the outer engine is fixed and generic,
- different in-world code yields different local dynamics.

That is the minimal "internalized rewrite specificity" result.
