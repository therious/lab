#!/bin/bash
# Archive SpecStory from all git worktrees
# Archives .specstory directories from lab, lab-a, and lab-b

set -e

ARCHIVE_DIR="$HOME/archives"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_NAME="specstory-all-worktrees-${TIMESTAMP}.tar.gz"

echo "=== SpecStory Archive Script ==="
echo "Archiving .specstory from all worktrees"
echo ""

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

WORKTREES=(
    "/Users/hzamir/work/lab"
    "/Users/hzamir/work/lab-a"
    "/Users/hzamir/work/lab-b"
)

WORKTREE_NAMES=("lab" "lab-a" "lab-b")

FOUND_COUNT=0
ARCHIVED_FILES=()

echo "## Scanning Worktrees"
echo ""

for i in "${!WORKTREES[@]}"; do
    DIR="${WORKTREES[$i]}"
    NAME="${WORKTREE_NAMES[$i]}"
    
    if [ -d "$DIR/.specstory" ]; then
        SIZE=$(du -sh "$DIR/.specstory" 2>/dev/null | cut -f1)
        echo -e "${GREEN}✓${NC} Found .specstory in $NAME ($SIZE)"
        FOUND_COUNT=$((FOUND_COUNT + 1))
        ARCHIVED_FILES+=("$DIR/.specstory")
    else
        echo -e "${YELLOW}○${NC} No .specstory in $NAME"
    fi
done

echo ""

if [ $FOUND_COUNT -eq 0 ]; then
    echo -e "${YELLOW}No .specstory directories found to archive${NC}"
    exit 0
fi

echo "## Creating Archive"
echo "Archive location: $ARCHIVE_DIR/$ARCHIVE_NAME"
echo ""

# Create temporary directory for staging
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy each .specstory to temp dir with worktree name prefix
for i in "${!WORKTREES[@]}"; do
    DIR="${WORKTREES[$i]}"
    NAME="${WORKTREE_NAMES[$i]}"
    
    if [ -d "$DIR/.specstory" ]; then
        echo "  Copying $NAME/.specstory..."
        cp -r "$DIR/.specstory" "$TEMP_DIR/${NAME}-specstory"
    fi
done

# Create archive
echo ""
echo "  Creating tar.gz archive..."
cd "$TEMP_DIR"
tar -czf "$ARCHIVE_DIR/$ARCHIVE_NAME" .

# Verify archive
if [ -f "$ARCHIVE_DIR/$ARCHIVE_NAME" ]; then
    ARCHIVE_SIZE=$(du -sh "$ARCHIVE_DIR/$ARCHIVE_NAME" | cut -f1)
    echo -e "${GREEN}✓${NC} Archive created: $ARCHIVE_NAME ($ARCHIVE_SIZE)"
    echo ""
    echo "## Archive Contents"
    tar -tzf "$ARCHIVE_DIR/$ARCHIVE_NAME" | head -20
    echo ""
    echo "## Next Steps"
    echo ""
    echo "1. Verify archive:"
    echo "   tar -tzf $ARCHIVE_DIR/$ARCHIVE_NAME | head"
    echo ""
    echo "2. Disable SpecStory in Cursor:"
    echo "   Settings → Extensions → SpecStory → Disable"
    echo ""
    echo "3. Remove .specstory directories (optional, after verification):"
    for i in "${!WORKTREES[@]}"; do
        DIR="${WORKTREES[$i]}"
        NAME="${WORKTREE_NAMES[$i]}"
        if [ -d "$DIR/.specstory" ]; then
            echo "   rm -rf $DIR/.specstory"
        fi
    done
    echo ""
    echo -e "${GREEN}Archive complete!${NC}"
else
    echo -e "${RED}Error: Archive creation failed${NC}"
    exit 1
fi

