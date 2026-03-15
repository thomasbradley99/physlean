import CPPP.Examples

namespace CPPP

/--
A minimal two-state system used as a concrete computation example.
-/
inductive Bit where
  | zero
  | one
deriving DecidableEq, Repr

/--
Bit-flip update rule.
-/
def flip : UpdateRule Bit
  | .zero => .one
  | .one => .zero

/--
Even for a concrete bit-flip task, specification does not entail reliable
enactment in a world with no available constructors.
-/
theorem flip_specified_not_reliably_enacted_in_barren :
    SpecifiedBy (taskOfFunction flip) ∧
      ¬ ReliablyEnactedIn (barrenWorld Bit) (taskOfFunction flip) := by
  exact specification_does_not_entail_reliable_enactment flip

/--
If a constructor that performs bit-flip is made available, the task is reliably
enacted in that world.
-/
theorem flip_reliably_enacted_with_constructor :
    ReliablyEnactedIn (worldWithTrivialConstructor flip) (taskOfFunction flip) := by
  exact taskOfFunction_reliablyEnacted_with_constructor flip

end CPPP
