# Security headers, included into every location that sets headers of its own.
#
# This repetition is not an oversight. nginx's add_header inheritance replaces
# rather than merges: a location declaring any add_header directive drops every
# add_header inherited from the server block. Setting these once at server level
# silently loses them on exactly the locations that set cache headers.
#
# The file is named .inc rather than .conf so that the conf.d/*.conf glob does
# not try to load it as a standalone server configuration.
#
# Deliberately absent: Content-Security-Policy. The Emscripten glue loading the
# tree-sitter runtime uses eval, so a policy without 'unsafe-eval' breaks
# parsing. See docs/adr/0002-tree-sitter-for-parsing.md.

add_header X-Content-Type-Options "nosniff"     always;
add_header X-Frame-Options        "SAMEORIGIN"  always;
add_header Referrer-Policy        "no-referrer" always;
