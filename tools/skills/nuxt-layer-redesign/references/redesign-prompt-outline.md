# Redesign Prompt Outline

Use this as the canonical structure for `docs/redesign-prompt-template.md`.

## A. Input block
Provide a YAML input section with:
- site theme (required)
- redesign goal
- audience
- brand direction
- constraints
- technical limits
- deliverables

## B. Master prompt
Include:
- project context with Nuxt layers
- immutable constraints list
- expected redesign scope
- instruction to implement UI changes, not only propose
- explicit output format

## C. Minimal one-shot prompt
Add a short variant for single component/page redesign.

## D. Validation request
Require the model to include:
- risk notes
- compatibility notes
- verification checklist
