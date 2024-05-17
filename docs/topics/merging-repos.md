# Merge repo instructions

## Use Case
When you have a repo with code to move into lab, and wish to preserve its history, follow these instructions

1. pick one branch of the repo to be merged into lab
2. best branch off of that branch, you are about to screw it up
3. determine which destination folder/folder hierarchy (in lab) the the merged code belongs
   * for example apps/myproject libs/mylibrary
   * there should be no conflict, with existing folders/files in lab
3. move *all* the files accordingly to the same path in the to-be-merged repo
   * note: leaving other files in the root (e.g. .idea .vscode) will cause a (resolvable) conflict
4. commit those changes
5. now go to the lab monorepo and execute the following commands to merge the files and their history
```shell
cd ~/work/lab  # go into the monorepo directory (assuming monorepo called "lab")
git remote add -f <namefoerthisremote> <path to repo>  # also can use a github remote
git merge <nameforthisremote>/<branch> --allow-unrelated-histories #bring in the repo
#resolve any conflicts, from not following step 3 above carefully
git commit -m "<your repo integration message here"
git remote remove <nameforthisremote>
```
