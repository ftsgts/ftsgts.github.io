#!/bin/bash
set -e

usage() {
    echo "Usage:"
    echo "  $0 <old_word> <new_word> [options] [target_paths...]"
    echo ""
    echo "Options:"
    echo "  -i, --include <pattern>   Include files/folders matching pattern (e.g., -i '_includes/*' -i '*.html')"
    echo "  -e, --exclude <pattern>   Exclude files/folders matching pattern (e.g., -e '*.sample' -e '_tools/*')"
    echo "  -n, --dry-run             Preview matching files and renames without making changes"
    echo "  -h, --help                Show this help message"
    exit 1
}

if [ "$#" -lt 2 ]; then
    usage
fi

export SEARCH_WORD="$1"
export REPLACE_WORD="$2"
shift 2

INCLUDES=()
EXCLUDES=()
TARGETS=()
DRY_RUN=false

# Parse arguments
while [ "$#" -gt 0 ]; do
    case "$1" in
        -i|--include)
            [ -z "$2" ] && { echo "Error: -i requires a pattern"; exit 1; }
            INCLUDES+=("$2")
            shift 2
            ;;
        -e|--exclude)
            [ -z "$2" ] && { echo "Error: -e requires a pattern"; exit 1; }
            EXCLUDES+=("$2")
            shift 2
            ;;
        -n|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            TARGETS+=("$1")
            shift
            ;;
    esac
done

[ ${#TARGETS[@]} -eq 0 ] && TARGETS=(".")

echo "==> Search: '$SEARCH_WORD'"
echo "==> Replace: '$REPLACE_WORD'"
[ ${#INCLUDES[@]} -gt 0 ] && echo "==> Includes: ${INCLUDES[*]}"
[ ${#EXCLUDES[@]} -gt 0 ] && echo "==> Excludes: ${EXCLUDES[*]}"
[ "$DRY_RUN" = true ] && echo "==> Mode: DRY RUN"

# -------------------------------------------------------------
# Pattern matcher: checks both filename and full directory path
# -------------------------------------------------------------
check_pattern() {
    local target="$1"
    local pattern="$2"

    local base="${target##*/}"      # e.g., header.html
    local rel="${target#./}"        # e.g., _includes/header.html
    local pat_clean="${pattern%/}"  # remove trailing slash if any

    # Match filename (e.g. *.sample, README.md)
    # shellcheck disable=SC2053
    if [[ "$base" == $pattern || "$base" == $pat_clean ]]; then
        return 0
    fi

    # Match directory or path (e.g. _includes/*, assets/*, _tools/*)
    # shellcheck disable=SC2053
    if [[ "$rel" == $pattern || "$rel" == $pat_clean || "$rel" == $pat_clean/* ]]; then
        return 0
    fi

    return 1
}

matches_filters() {
    local target="$1"

    # 1. Exclude takes precedence
    for exc in "${EXCLUDES[@]}"; do
        if check_pattern "$target" "$exc"; then
            return 1
        fi
    done

    # 2. If include filters are set, must match at least one
    if [ ${#INCLUDES[@]} -gt 0 ]; then
        for inc in "${INCLUDES[@]}"; do
            if check_pattern "$target" "$inc"; then
                return 0
            fi
        done
        return 1
    fi

    return 0
}

# -------------------------------------------------------------
# 1. Update text inside files
# -------------------------------------------------------------
echo ""
echo "--- Scanning file contents ---"

MATCH_COUNT=0
for target in "${TARGETS[@]}"; do
    [ ! -e "$target" ] && continue

    while IFS= read -r -d '' file; do
        if ! matches_filters "$file"; then
            continue
        fi

        # Skip binary files (.png, .ico, fonts, .DS_Store)
        perl -e 'exit(-B $ARGV[0] ? 0 : 1)' "$file" && continue

        if [ "$DRY_RUN" = true ]; then
            if perl -ne 'BEGIN{$s=$ENV{"SEARCH_WORD"}} exit 0 if /\Q$s\E/i; END{exit 1}' "$file" 2>/dev/null; then
                echo "  [Content Match] $file"
                ((MATCH_COUNT++)) || true
            fi
        else
            # Check if file has matches before modifying
            if perl -ne 'BEGIN{$s=$ENV{"SEARCH_WORD"}} exit 0 if /\Q$s\E/i; END{exit 1}' "$file" 2>/dev/null; then
                perl -i -pe '
                    BEGIN {
                        $s = $ENV{"SEARCH_WORD"};
                        $r = $ENV{"REPLACE_WORD"};
                        $r_lower = lc($r);
                        $r_upper = uc($r);
                        $r_title = ucfirst(lc($r));
                    }
                    s/\Q$s\E/
                        $& eq uc($&) ? $r_upper :
                        $& eq ucfirst(lc($&)) ? $r_title :
                        $r_lower
                    /gei;
                ' "$file"
                echo "  [Updated Content] $file"
                ((MATCH_COUNT++)) || true
            fi
        fi
    done < <(find "$target" -type f -print0)
done

# -------------------------------------------------------------
# 2. Rename matching files and directories
# -------------------------------------------------------------
echo ""
echo "--- Scanning file & directory names ---"

RENAME_COUNT=0
for target in "${TARGETS[@]}"; do
    [ ! -e "$target" ] && continue

    while IFS= read -r -d '' item; do
        [ "$item" = "." ] && continue

        if ! matches_filters "$item"; then
            continue
        fi

        dir=$(dirname "$item")
        base=$(basename "$item")

        new_base=$(printf '%s' "$base" | perl -pe '
            BEGIN {
                $s = $ENV{"SEARCH_WORD"};
                $r = $ENV{"REPLACE_WORD"};
                $r_lower = lc($r);
                $r_upper = uc($r);
                $r_title = ucfirst(lc($r));
            }
            s/\Q$s\E/
                $& eq uc($&) ? $r_upper :
                $& eq ucfirst(lc($&)) ? $r_title :
                $r_lower
            /gei;
        ')

        if [ "$base" != "$new_base" ]; then
            if [ "$DRY_RUN" = true ]; then
                echo "  [Would Rename] $item -> $dir/$new_base"
            else
                mv "$item" "$dir/$new_base"
                echo "  [Renamed] $item -> $dir/$new_base"
            fi
            ((RENAME_COUNT++)) || true
        fi
    done < <(find "$target" -depth -iname "*${SEARCH_WORD}*" -print0)
done

echo ""
echo "Done! Files modified: $MATCH_COUNT | Items renamed: $RENAME_COUNT"

