import CPPP.Basic

namespace CPPP

/--
`PhysicallyOccurs W T` is treated as a primitive physical predicate.
It is intentionally not defined in terms of constructor existence.
-/
axiom PhysicallyOccurs {State : Type u} (W : World State) (T : Task State) : Prop

/--
Axiom A1 (bridge): if a task physically occurs in a world, then it is possible
in that world.
-/
axiom occurrence_implies_possible {State : Type u} (W : World State) (T : Task State) :
  PhysicallyOccurs W T -> PossibleIn W T

/--
Axiom A2 (bridge): if a task is possible in a world, then some available
constructor realises it.
-/
axiom possible_implies_available_realiser {State : Type u} (W : World State) (T : Task State) :
  PossibleIn W T -> ∃ K, W.available K ∧ Realises K T

/--
Outcome theorem: from physical occurrence plus bridge axioms, an available
ready constructor exists. This is a non-definitional constructor-witness result.
-/
theorem physically_occurs_requires_ready_constructor {State : Type u}
    (W : World State) (T : Task State) :
    PhysicallyOccurs W T ->
      ∃ K, W.available K ∧ HasReadyConfig K := by
  intro hOcc
  have hPossible : PossibleIn W T := occurrence_implies_possible W T hOcc
  rcases possible_implies_available_realiser W T hPossible with ⟨K, hAvail, hRealises⟩
  exact ⟨K, hAvail, hRealises.left⟩

end CPPP
