namespace CPPP

/--
An abstract update rule on a state space.
This is a mathematical specification, not yet a physical enactment.
-/
abbrev UpdateRule (State : Type u) := State -> State

/--
A task is an input-output specification on states.
-/
structure Task (State : Type u) where
  holds : State -> State -> Prop

/--
Every update rule induces a task:
state `s` is to be transformed into `f s`.
-/
def taskOfFunction {State : Type u} (f : UpdateRule State) : Task State :=
  ⟨fun s s' => s' = f s⟩

/--
`T` is specified by some abstract update rule.
-/
def SpecifiedBy {State : Type u} (T : Task State) : Prop :=
  ∃ f : UpdateRule State, T = taskOfFunction f

/--
A constructor is a system with internal configurations that can act on states
and remain ready to do so again.
-/
structure Constructor (State : Type u) (Config : Type v) where
  ready : Config -> Prop
  acts : Config -> State -> State -> Prop
  persists : ∀ c s s', ready c -> acts c s s' -> ready c

/--
The constructor has at least one ready configuration.
-/
def HasReadyConfig {State : Type u} {Config : Type v}
    (K : Constructor State Config) : Prop :=
  ∃ c, K.ready c

/--
A constructor realises a task if it has a ready configuration and every ready
configuration can transform any input into an output satisfying the task.
-/
def Realises {State : Type u} {Config : Type v}
    (K : Constructor State Config) (T : Task State) : Prop :=
  HasReadyConfig K ∧
    ∀ c s, K.ready c -> ∃ s', K.acts c s s' ∧ T.holds s s'

/--
Reliable enactment is just task-realisation viewed as an explicitly physical
notion: the task is performed by a constructor that remains reusable.
-/
abbrev ReliablyEnacts {State : Type u} {Config : Type v}
    (K : Constructor State Config) (T : Task State) : Prop :=
  Realises K T

/--
A world packages the constructors treated as physically available for a given
state space.
-/
structure World (State : Type u) where
  Config : Type v
  available : Constructor State Config -> Prop

/--
A task is possible in a world when some available constructor realises it.
-/
def PossibleIn {State : Type u} (W : World State) (T : Task State) : Prop :=
  ∃ K, W.available K ∧ Realises K T

/--
A task is reliably enacted in a world when an available constructor realises it.
This makes the constructor requirement part of the statement itself.
-/
abbrev ReliablyEnactedIn {State : Type u} (W : World State) (T : Task State) :
    Prop :=
  ∃ K, W.available K ∧ ReliablyEnacts K T

/--
When the background world is understood, possibility means possibility in that
world.
-/
abbrev Possible {State : Type u} (W : World State) (T : Task State) : Prop :=
  PossibleIn W T

/--
If a task is reliably enacted in a world, then some available constructor
witnesses that enactment.
-/
theorem reliablyEnactedIn_requires_constructor {State : Type u}
    (W : World State) (T : Task State) :
    ReliablyEnactedIn W T ->
      ∃ K, W.available K ∧ ReliablyEnacts K T := by
  intro h
  exact h

/--
Reliable enactment yields a ready constructor configuration. This is the
formal sense in which reliable physical performance presupposes a constructor.
-/
theorem reliableEnactment_has_ready_constructor {State : Type u}
    (W : World State) (T : Task State) :
    ReliablyEnactedIn W T ->
      ∃ K, W.available K ∧ HasReadyConfig K := by
  intro h
  rcases h with ⟨K, hAvailable, hRealises⟩
  exact ⟨K, hAvailable, hRealises.left⟩

end CPPP
