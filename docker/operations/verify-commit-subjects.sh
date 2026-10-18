#!/usr/bin/env bash

set -euo pipefail

usage() {
    echo "Usage: $0 [<base-sha>] <head-sha>" >&2
    exit 2
}

if (( $# < 1 || $# > 2 )); then
    usage
fi

if (( $# == 1 )); then
    base_sha=''
    head_sha=$1
else
    base_sha=$1
    head_sha=$2
fi

sha_pattern='^[0-9a-fA-F]{40}$'
zero_sha='0000000000000000000000000000000000000000'

if [[ ! $head_sha =~ $sha_pattern ]] || ! git cat-file -e "${head_sha}^{commit}" 2>/dev/null; then
    echo "Head SHA must identify an available commit." >&2
    exit 2
fi

revision=$head_sha

if [[ -n $base_sha && $base_sha != "$zero_sha" ]]; then
    if [[ ! $base_sha =~ $sha_pattern ]]; then
        echo "Base SHA must be empty or a 40-character hexadecimal commit ID." >&2
        exit 2
    fi

    if git cat-file -e "${base_sha}^{commit}" 2>/dev/null; then
        revision="${base_sha}..${head_sha}"
    else
        echo "Base commit is unavailable; checking the complete reachable history."
    fi
fi

failed=0
checked=0

while IFS= read -r commit_sha; do
    [[ -n $commit_sha ]] || continue

    checked=$((checked + 1))
    subject=$(git show -s --format=%s "$commit_sha")

    if LC_ALL=C grep -q '[^ -~]' <<< "$subject"; then
        printf 'Non-ASCII commit subject: %s %s\n' "$commit_sha" "$subject" >&2
        failed=1
    fi
done < <(git rev-list --reverse "$revision")

if (( failed != 0 )); then
    echo "Commit subjects must use English ASCII text." >&2
    exit 1
fi

printf 'Verified %d commit subject(s).\n' "$checked"
