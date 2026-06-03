#!/bin/bash
# run-pipeline.sh
# ─────────────────────────────────────────────────────────────
# Usage:
#   ./run-pipeline.sh tasks:<name>                 # run full pipeline
#   ./run-pipeline.sh tasks:<name> agent:<name>    # run single agent
#
# Examples:
#   ./run-pipeline.sh tasks:initial-setup
#   ./run-pipeline.sh tasks:initial-setup agent:fixer
#   ./run-pipeline.sh tasks:notifications agent:reviewer
#
# Available agents: spec, architect, builder, test, reviewer, fixer
# ─────────────────────────────────────────────────────────────

set -e

# ── Parse arguments ────────────────────────────────────────────

TASK=""
AGENT=""

for arg in "$@"; do
  if [[ $arg == tasks:* ]]; then
    TASK="${arg#tasks:}"
  elif [[ $arg == agent:* ]]; then
    AGENT="${arg#agent:}"
  fi
done

if [ -z "$TASK" ]; then
  echo "Error: no task specified."
  echo "Usage: ./run-pipeline.sh tasks:<name> [agent:<name>]"
  exit 1
fi

# ── Validate task file exists ──────────────────────────────────

INCOMING="tasks/incoming/$TASK.md"

if [ ! -f "$INCOMING" ]; then
  echo "Error: task file not found at $INCOMING"
  exit 1
fi

# ── Validate agent name if provided ───────────────────────────

VALID_AGENTS=("spec" "architect" "builder" "test" "reviewer" "fixer")

if [ -n "$AGENT" ]; then
  VALID=false
  for a in "${VALID_AGENTS[@]}"; do
    if [ "$a" = "$AGENT" ]; then
      VALID=true
      break
    fi
  done

  if [ "$VALID" = false ]; then
    echo "Error: unknown agent '$AGENT'"
    echo "Valid agents: ${VALID_AGENTS[*]}"
    exit 1
  fi
fi

# ── Helpers ────────────────────────────────────────────────────

run_agent() {
  local agent_name=$1
  local label=$2

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶  Agent: $label"
  echo "   Task:  $TASK"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Inject TASK name into agent prompt and run
  sed "s/\[FEATURE\]/$TASK/g" "agents/$agent_name.md" | claude --print

  if [ $? -ne 0 ]; then
    echo ""
    echo "✗ $label failed. Pipeline stopped."
    exit 1
  fi

  echo ""
  echo "✓ $label complete"
}

gate() {
  local label=$1
  echo ""
  echo "──────────────────────────────────────"
  echo "  GATE: $label"
  echo "  Review the output above."
  echo "  Continue? (y/n)"
  echo "──────────────────────────────────────"
  read -r answer
  if [ "$answer" != "y" ]; then
    echo "Stopped at gate. Resume with:"
    echo "  ./run-pipeline.sh tasks:$TASK agent:<next-agent>"
    exit 0
  fi
}

check_review_status() {
  local review_file="tasks/$TASK-review.md"

  if [ ! -f "$review_file" ]; then
    echo "Warning: review file not found at $review_file — skipping status check"
    return
  fi

  STATUS=$(grep "^## STATUS:" "$review_file" | awk '{print $3}')

  if [ "$STATUS" = "FAIL" ]; then
    ITERATION=$(grep "^iteration:" "tasks/$TASK-build-summary.md" 2>/dev/null | awk '{print $2}')
    ITERATION=${ITERATION:-0}

    if [ "$ITERATION" -lt 3 ]; then
      echo ""
      echo "  Review status: FAIL — running fixer agent..."
      run_agent "fixer-agent" "Fixer"
      run_agent "reviewer-agent" "Re-review"
      check_review_status  # recurse up to 3 times
    else
      echo ""
      echo "✗ Review failed after 3 fix attempts."
      echo "  Check tasks/$TASK-review.md for unresolved blockers."
      exit 1
    fi
  else
    echo ""
    echo "✓ Review status: PASS"
  fi
}

# ── Single agent mode ──────────────────────────────────────────

if [ -n "$AGENT" ]; then
  echo ""
  echo "Single agent mode: $AGENT → $TASK"
  run_agent "$AGENT-agent" "$(tr '[:lower:]' '[:upper:]' <<< ${AGENT:0:1})${AGENT:1}"
  exit 0
fi

# ── Full pipeline mode ─────────────────────────────────────────

echo ""
echo "Starting full pipeline for: $TASK"
echo "Reading from: $INCOMING"

run_agent "spec-agent"      "Spec"
gate      "Review spec before architecture"

run_agent "architect-agent" "Architect"
gate      "Review plan before build"

run_agent "builder-agent"   "Builder"
run_agent "test-agent"      "Test"
run_agent "reviewer-agent"  "Review"

check_review_status

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Pipeline complete: $TASK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
