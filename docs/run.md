# Build and Outputs

## Build command

Run from the repository root:

```bash
"/Users/thomasbradley/.elan/bin/lake" build
```

If `lake` is on your PATH, you can use:

```bash
lake build
```

## What "output" means in Lean

This project proves theorems by typechecking. There is no simulation output file.
Successful build means Lean has verified all proofs.

## Artifact locations

Compiled artifacts are written under `.lake/build/lib/lean/`, including:

- `CPPP/Basic.olean`
- `CPPP/Examples.olean`
- `CPPP.olean`

You may also see companion files: `.ilean`, `.trace`, and `.hash`.
