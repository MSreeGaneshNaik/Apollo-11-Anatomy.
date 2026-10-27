#!/bin/sh
# Builds dist/apollo.html and publishes it to the gh-pages branch, which GitHub Pages serves.
# The site is the page itself at / (index.html) and at /apollo.html for older links.
set -e
cd "$(dirname "$0")/.."
repo=$(pwd)
node scripts/build.mjs
git fetch -q origin gh-pages
site=$(mktemp -d)
git worktree add -q --detach "$site" origin/gh-pages
cd "$site"
git rm -rq --ignore-unmatch .
cp "$repo/dist/apollo.html" index.html
cp "$repo/dist/apollo.html" apollo.html
touch .nojekyll
git add -A
if git commit -q -m "Deploy $(git -C "$repo" rev-parse --short HEAD)"; then git push -q origin HEAD:gh-pages && echo "deployed"; else echo "site already up to date"; fi
cd "$repo"
git worktree remove --force "$site"
