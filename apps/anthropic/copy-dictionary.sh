#!/bin/bash
# Script to copy dictionary YAML file to roots app

SOURCE_FILE="src/root-dictionary-definitions.yaml"
TARGET_DIR="../roots/src/roots"
TARGET_FILE="${TARGET_DIR}/root-dictionary-definitions.yaml"

if [ ! -f "$SOURCE_FILE" ]; then
    echo "❌ Source file not found: $SOURCE_FILE"
    exit 1
fi

mkdir -p "$TARGET_DIR"
cp "$SOURCE_FILE" "$TARGET_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Copied dictionary file to: $TARGET_FILE"
else
    echo "❌ Failed to copy dictionary file"
    exit 1
fi

