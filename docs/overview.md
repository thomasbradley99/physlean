# Project Overview

## Aim

This project formalizes a core constructor-theoretic claim in Lean:

- abstract computational update rules specify tasks;
- reliable physical enactment is a separate notion;
- reliable enactment requires an available constructor witness.

## Scope of the current formalization

This is a minimal first-step model, not full constructor theory.
The focus is the logical gap between specification and realization.

## Core files

- `CPPP/Basic.lean`: definitions of `Task`, `Constructor`, `World`, `PossibleIn`, and core theorems.
- `CPPP/Examples.lean`: toy worlds and examples separating specification from enactment.
- `docs/note.md`: informal narrative companion.

## One-line summary

Functions specify transformations; constructors realize them physically.
