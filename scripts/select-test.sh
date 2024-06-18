#!/bin/bash

DIR="${0%/*}"
source "$DIR"/select-options.sh

echo "Select one option using up/down keys and enter to confirm:"
options=("one" "two" "three")

select_option "${options[@]}"
choice=$?

echo "Choosen index = $choice"
echo "        value = ${options[$choice]}"
