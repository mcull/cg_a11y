#!/usr/bin/env bash
set -euo pipefail

REPO=${1:-"mcull/cg_a11y"}
OWNER=${REPO%%/*}
NAME=${REPO#*/}

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required" >&2
  exit 1
fi

if [ ! -f github_plan.json ]; then
  echo "github_plan.json not found in current directory" >&2
  exit 1
fi

echo "Using repo: $REPO"

echo "Ensuring labels..."
jq -c '.labels[]' github_plan.json | while read -r lbl; do
  name=$(jq -r '.name' <<<"$lbl")
  color=$(jq -r '.color // "ededed"' <<<"$lbl")
  desc=$(jq -r '.description // ""' <<<"$lbl")
  if gh api repos/$OWNER/$NAME/labels | jq -er ".[] | select(.name == \"$name\")" >/dev/null; then
    gh api repos/$OWNER/$NAME/labels/$(printf %s "$name" | jq -sRr @uri) -X PATCH -f color="$color" -f description="$desc" >/dev/null && echo "Updated label: $name" || echo "Label exists: $name"
  else
    gh api repos/$OWNER/$NAME/labels -X POST -f name="$name" -f color="$color" -f description="$desc" >/dev/null && echo "Created label: $name" || echo "Skipped label: $name"
  fi
done

# Milestones
echo "Ensuring milestones..."
jq -c '.milestones[]' github_plan.json | while read -r ms; do
  title=$(jq -r '.title' <<<"$ms")
  desc=$(jq -r '.description // ""' <<<"$ms")
  if gh api repos/$OWNER/$NAME/milestones?state=all | jq -er ".[] | select(.title == \"$title\")" >/dev/null; then
    echo "Milestone exists: $title"
  else
    gh api repos/$OWNER/$NAME/milestones -X POST -f title="$title" -f description="$desc" >/dev/null && echo "Created milestone: $title" || echo "Skipped milestone: $title"
  fi
done

# Issues
echo "Ensuring issues..."
jq -c '.milestones[]' github_plan.json | while read -r ms; do
  ms_title=$(jq -r '.title' <<<"$ms")
  ms_number=$(gh api repos/$OWNER/$NAME/milestones?state=all | jq -r ".[] | select(.title == \"$ms_title\").number")
  jq -c '.issues[]' <<<"$ms" | while read -r is; do
    title=$(jq -r '.title' <<<"$is")
    body=$(jq -r '.body // ""' <<<"$is")
    # Check existence by search
    if gh api search/issues -f q="repo:$OWNER/$NAME in:title \"$title\"" | jq -er ".items[] | select(.title == \"$title\")" >/dev/null; then
      echo "Issue exists: $title"
      continue
    fi
    # Create issue
    create_cmd=(gh api repos/$OWNER/$NAME/issues -X POST -f title="$title" -f body="$body" -f milestone="$ms_number")
    # Add labels as repeated -f labels[]
    for l in $(jq -r '.labels[]?' <<<"$is"); do
      create_cmd+=( -f labels[]="$l" )
    done
    "${create_cmd[@]}" >/dev/null && echo "Created issue: $title"
  done
done

echo "Done."
