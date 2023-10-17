#!/usr/bin/env sh

set -euo pipefail

_flags=""

while [ $# -ge 1 ]; do
  case "$1" in
    -z|--outOfOrder)
      _flags="${_flags} ${1}"
      shift 1
      ;;
  esac
done

PATH=./node_modules/.bin:${PATH}

current_version=$(npx synor current --no-header --columns=version | tail -1 | sed -e 's/^[ \t]*//')
target_version=$(npx synor info --no-header --columns=version --filter=state=pending | tail -1 | sed -e 's/^[ \t]*//')

if test "$target_version" = ''; then
  target_version="$current_version"
fi

NODE_ENV="${NODE_ENV:-""}"

if test "$NODE_ENV" = '' || test "$NODE_ENV" = 'development' || test "$NODE_ENV" = 'test'; then
  echo $ npx synor migrate --from=${current_version} --to=${target_version} ${_flags}
  echo
  npx synor migrate --from=${current_version} --to=${target_version} ${_flags}
else
  echo $ npx synor migrate ${target_version} ${_flags}
  echo
  npx synor migrate ${target_version} ${_flags}
fi
