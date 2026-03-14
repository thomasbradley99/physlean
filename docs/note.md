# PhysLean: Computational Physics Presupposes Constructors

## Thesis

Computational physics often represents evolution as an abstract map on a state space. But an abstract map is only a specification of a transformation. A physical transformation requires a constructor: a system that carries out the task and remains able to do so again.

This note is the informal companion to a small PhysLean project formalising that
distinction in Lean.

## The project in three lines

Computational physics writes evolution as a function on states.
Constructor theory distinguishes that abstract task from its physical realisation.
This repository formalises that distinction in Lean.

## Four definitions

### State

A state space is represented by a Lean type.

### Task

A task is an input-output specification on states.

### Constructor

A constructor is a system that can perform the transformation and remain ready to perform it again.

### Possible

A task is possible in a world when some physically available constructor realises it.

## One claim

A function specifies a task but does not by itself give a constructor.

More sharply:

if a function-specified task is reliably enacted, then some constructor must
be available to enact it.

## One example

A program defines a function on data.
The output state does not become physically real merely because the function is defined.
The CPU executes it.

Likewise, in computational physics, an update rule specifies the next state abstractly, but the constructor-theoretic question is what physically enacts that transformation.

## What this Lean project is for

PhysLean is a good environment for making distinctions like "map versus realisation" precise.

The point is to:

- define the concepts precisely,
- see what follows from which axioms,
- expose the hidden assumption that a map alone is not a realised physical transformation.

## What is actually shown

The formal claim proved in the toy framework is not that physics is exhausted by
constructor theory. It is the narrower structural claim that:

- function-specification is one notion,
- reliable physical enactment is another,
- and reliable enactment carries an explicit constructor witness.

That is the exact sense in which the project says computational physics
presupposes constructors.

## What success looks like

A good minimal endpoint is:

- a short note explaining the idea in one or two pages,
- a tiny Lean file with the core definitions,
- one proved proposition showing that task-specification and constructor-realisation are distinct notions,
- one worked example from computation.

That is enough to make the project real and enough to show in a first meeting.
