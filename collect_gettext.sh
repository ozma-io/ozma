#!/bin/sh -e

# Build .pot file
pot=$(mktemp)
find src -name \*.cs -exec xgettext -o "$pot" --from-code utf-8 {} \;
echo >> "$pot"
find views -name \*.liquid -exec awk '
    { if(match($0,/"([^"]*)" *\| *getstring/,m)) printf "#: {}:%u\nmsgid \"%s\"\nmsgstr \"\"\n\n", NR, m[1] }
  ' {} \; >> "$pot"
sed -i 's/charset=CHARSET/charset=utf-8/g' "$pot"
msguniq "$pot" > messages.pot
rm "$pot"

# Update .po files
for locales in locale/*; do
  path="$locales/LC_MESSAGES/FunApp.po"
  if [ -e "$path" ]; then
    echo "Updating $path"
    msgmerge -U "$path" messages.pot
  fi
done
