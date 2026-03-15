# Talk Notes (Quick)

## 30-second pitch

I formalized a core constructor-theoretic inference in Lean.
An update rule `State -> State` specifies a task, but that does not by itself
entail reliable physical enactment. Using explicit bridge axioms from physical
occurrence to possibility and from possibility to constructor realization, Lean
proves that physical occurrence implies an available ready constructor witness.

## 2-minute walkthrough

1. Problem:
   computational descriptions often blur abstract maps with physical processes.

2. Formal setup in Lean:
   - `Task`: input-output specification;
   - `Constructor`: acts on states and remains ready (`persists`);
   - `World`: which constructors are physically available;
   - `PossibleIn`: possible in a world if realized by an available constructor.

3. Baseline result:
   in a barren world, tasks can be specified but not reliably enacted.

4. Non-circular bridge result:
   in `CPPP/BridgeInference.lean`, `PhysicallyOccurs` is primitive (not defined
   via constructor existence). With bridge axioms:
   - `occurrence_implies_possible`
   - `possible_implies_available_realiser`
   we prove:
   - `physically_occurs_requires_ready_constructor`.

5. Takeaway:
   specification and physical realization are formally distinct; constructor
   assumptions are explicit and checkable.

## If asked "what is the output?"

- Lean output is proof checking, not simulation.
- Build success means all proofs typecheck.
- Artifacts are `.olean`/`.ilean` files under `.lake/build/lib/lean/`.

## If asked "is this full constructor theory?"

No. This is a minimal core fragment proving one key inference pattern.
Next phase would add richer CT structure (e.g., information media, composition,
replication/self-reproduction logic).

## Likely questions and short answers

Q: Is this theorem trivial by definition?
A: The baseline theorem can be close to definitional. The bridge file avoids
that by treating physical occurrence as primitive and deriving constructor
existence through explicit axioms.

Q: What did Lean add beyond prose?
A: It forces the assumptions to be explicit and verifies the inference exactly.

Q: What is the scientific claim right now?
A: A map specifies a task; reliable physical performance requires additional
constructor-level assumptions.

## 1-line close

Functions specify; constructors realize.
