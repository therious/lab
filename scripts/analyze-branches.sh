#!/bin/bash
# Branch Analysis Script
# Analyzes branches across lab, lab-a, and lab-b to identify merge candidates

set -e

echo "=== Branch Analysis Report ==="
echo "Generated: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

REPO_DIRS=("$PROJECT_ROOT" "/Users/hzamir/work/lab" "/Users/hzamir/work/lab-a")
REPO_NAMES=("lab-b" "lab" "lab-a")

echo "## Repository Status"
echo ""

for i in "${!REPO_DIRS[@]}"; do
    DIR="${REPO_DIRS[$i]}"
    NAME="${REPO_NAMES[$i]}"
    
    if [ -d "$DIR/.git" ]; then
        echo -e "${GREEN}✓${NC} $NAME: Git repository found"
        cd "$DIR"
        CURRENT_BRANCH=$(git branch --show-current)
        echo "  Current branch: $CURRENT_BRANCH"
        echo "  Branches: $(git branch | wc -l | xargs) local, $(git branch -r | wc -l | xargs) remote"
    else
        echo -e "${RED}✗${NC} $NAME: Not a git repository or doesn't exist"
    fi
    echo ""
done

echo "## Branch Comparison (lab-b)"
echo ""

cd "$PROJECT_ROOT"

echo "### Branches merged into main:"
git branch --merged main 2>/dev/null | sed 's/^/  - /' || echo "  (none or main doesn't exist)"

echo ""
echo "### Branches NOT merged into main:"
git branch --no-merged main 2>/dev/null | sed 's/^/  - /' || echo "  (all merged or main doesn't exist)"

echo ""
echo "### All local branches:"
git branch | sed 's/^/  - /'

echo ""
echo "### Recent commits per branch (last 3):"
for branch in $(git branch | sed 's/^\* //' | sed 's/^  //'); do
    echo ""
    echo "**$branch**:"
    git log "$branch" --oneline -3 2>/dev/null | sed 's/^/  - /' || echo "  (no commits)"
done

echo ""
echo "## .specstory Status"
echo ""

if git ls-files | grep -q specstory; then
    echo -e "${RED}⚠ WARNING: .specstory files are tracked in git${NC}"
    echo "Tracked files:"
    git ls-files | grep specstory | sed 's/^/  - /'
else
    echo -e "${GREEN}✓ .specstory files are not tracked${NC}"
fi

echo ""
if [ -f .gitignore ] && grep -q "specstory" .gitignore; then
    echo -e "${GREEN}✓ .specstory is in .gitignore${NC}"
else
    echo -e "${YELLOW}⚠ .specstory is NOT in .gitignore${NC}"
fi

echo ""
echo "## Recommendations"
echo ""

echo "1. Remove .specstory from git tracking:"
echo "   git rm -r --cached .specstory"
echo "   echo '.specstory/' >> .gitignore"
echo "   git add .gitignore"
echo "   git commit -m 'Remove .specstory from tracking'"
echo ""

echo "2. Create mega branch from main:"
echo "   git checkout main"
echo "   git pull origin main"
echo "   git checkout -b mega-feature-branch"
echo ""

echo "3. Merge branches incrementally (one at a time, test after each)"
echo ""

