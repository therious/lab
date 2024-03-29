#example ./last-git-forks.sh kajetansw/purescript-react-vite-starter
for url in $(
  curl -s "https://github.com/$1/network/members" |
  awk -F '"' '/>'"${1#*/}"'</{print "https://github.com"$4}'
) ; do
curl -s $url/branches | tac | awk -F '"' '
/relative-time/{
 # gets the last update of the branch
 if ( $2 > lasttime ) { lasttime=$2 ; lastbranch=branch }
}
/Link to (.*) file tree/{
 # get the branch name
 branch=gensub(/Link to (.*) file tree[.]/,"\\1",1,$4)
}
END{
 if (lasttime>"") printf "%-24s %-15s %-s\n",lasttime, lastbranch, name
}
' xname="${url#*com/}" name=${url%/*}
done | sort
