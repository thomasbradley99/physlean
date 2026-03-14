import CPPP.Basic

namespace CPPP

/--
Every function-specified task is indeed specified by a function.
-/
theorem taskOfFunction_specifiedBy {State : Type u} (f : UpdateRule State) :
    SpecifiedBy (taskOfFunction f) := by
  exact ⟨f, rfl⟩

/--
A toy constructor that always applies `f` and remains ready.
This is only a coherence check on the definitions.
-/
def trivialConstructor {State : Type u} (f : UpdateRule State) :
    Constructor State Unit where
  ready := fun _ => True
  acts := fun _ s s' => s' = f s
  persists := by
    intro _ _ _ _ _
    trivial

/--
The toy constructor realises the task induced by `f`.
-/
theorem trivialConstructor_realises_taskOfFunction {State : Type u}
    (f : UpdateRule State) :
    Realises (trivialConstructor f) (taskOfFunction f) := by
  constructor
  · exact ⟨(), trivial⟩
  · intro c s hReady
    refine ⟨f s, ?_⟩
    constructor
    · simp [trivialConstructor]
    · simp [taskOfFunction]

/--
Hence the task induced by `f` is reliably enacted by the toy constructor.
-/
theorem trivialConstructor_reliablyEnacts_taskOfFunction {State : Type u}
    (f : UpdateRule State) :
    ReliablyEnacts (trivialConstructor f) (taskOfFunction f) := by
  exact trivialConstructor_realises_taskOfFunction f

/--
A toy world in which no constructors are physically available.
It is useful for showing that abstract specification alone does not imply
physical possibility.
-/
def barrenWorld (State : Type u) : World State where
  Config := Unit
  available := fun _ => False

/--
In the barren world, a task can still be specified by a function even though
it is not reliably enacted there. This is the formal separation between
specification and realisation used by the project.
-/
theorem specification_does_not_entail_reliable_enactment {State : Type u}
    (f : UpdateRule State) :
    SpecifiedBy (taskOfFunction f) ∧
      ¬ ReliablyEnactedIn (barrenWorld State) (taskOfFunction f) := by
  constructor
  · exact taskOfFunction_specifiedBy f
  · intro hReliable
    rcases hReliable with ⟨K, hAvailable, _⟩
    simp [barrenWorld] at hAvailable

/--
If a function-specified task is reliably enacted in a world, then there is an
available constructor witnessing that enactment.
-/
theorem function_requires_constructor_for_reliable_enactment
    {State : Type u} (W : World State) (f : UpdateRule State) :
    ReliablyEnactedIn W (taskOfFunction f) ->
      ∃ K, W.available K ∧ HasReadyConfig K := by
  intro hReliable
  exact reliableEnactment_has_ready_constructor W (taskOfFunction f) hReliable

/--
By contrast, once a constructor is supplied, the task becomes possible in an
appropriate world.
-/
def worldWithTrivialConstructor {State : Type u} (f : UpdateRule State) :
    World State where
  Config := Unit
  available := fun K => K = trivialConstructor f

theorem taskOfFunction_possible_with_constructor {State : Type u}
    (f : UpdateRule State) :
    PossibleIn (worldWithTrivialConstructor f) (taskOfFunction f) := by
  refine ⟨trivialConstructor f, ?_⟩
  constructor
  · rfl
  · exact trivialConstructor_realises_taskOfFunction f

/--
In the world where the constructor is available, the function-specified task is
reliably enacted.
-/
theorem taskOfFunction_reliablyEnacted_with_constructor {State : Type u}
    (f : UpdateRule State) :
    ReliablyEnactedIn (worldWithTrivialConstructor f) (taskOfFunction f) := by
  refine ⟨trivialConstructor f, ?_⟩
  constructor
  · rfl
  · exact trivialConstructor_reliablyEnacts_taskOfFunction f

end CPPP
