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

## Python demo

The repository also includes a small executable toy model showing a
constructor-like in-world rewrite controller.

Run:

```bash
python3 demo-constructor-code/run.py
```

This writes visual outputs under `demo-constructor-code/outputs/`, including:

- `growth/step_0.svg` through `growth/step_4.svg`
- `pruning/step_0.svg` through `pruning/step_4.svg`
- `comparison_final.svg`
- `index.html`
