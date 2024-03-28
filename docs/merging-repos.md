* in a branch to merge to monorepo, move files/folders to where they would be located in the monorepo
* commit that
* in the monorepo to get the repo and its history 
```shell
cd ~/work/lab  # go into the monorepo directory (assuming monorepo called "lab")
git remote add -f <nameforthisremote> <path to repo>  #also can use a github remote
git merge <nameforthisremote>/<branch> --allow-unrelated-histories #bring in the repo
#resolve any conflicts, likely .idea files
#commit the changes
git remote remove <nameforthisremote>
```
