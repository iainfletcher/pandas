// Generates index.html from the JSX source in supabase/functions/app/index.ts.
//
// The page it produces has no build-time dependencies of its own: JSX is
// compiled here rather than in the browser, so the served file is plain JS and
// needs only React, ReactDOM and supabase-js from CDNs.
//
// Run: NODE_PATH=<dir containing @babel/standalone> node build.js

const fs = require('fs');
const path = require('path');
const babel = require('@babel/standalone');

const SRC = path.join(__dirname, 'supabase/functions/app/index.ts');
const OUT = path.join(__dirname, 'index.html');

const src = fs.readFileSync(SRC, 'utf8');
const marker = 'const PAGE = `';
const start = src.indexOf(marker) + marker.length;
const end = src.lastIndexOf('`;');
let page = src.slice(start, end);

if (page.length < 40000) {
  console.error('Extraction failed - got only', page.length, 'chars');
  process.exit(1);
}

// Pin CDN versions. cdn.tailwindcss.com follows latest, and Tailwind 4 ignores
// the `tailwind.config` object this page uses; unpkg without an explicit path
// can resolve to a non-UMD build that never defines window.supabase.
page = page.replace(
  '<script src="https://cdn.tailwindcss.com"></script>',
  '<script src="https://cdn.tailwindcss.com/3.4.16"></script>'
);
page = page.replace(
  '<script src="https://unpkg.com/@supabase/supabase-js@2"></script>',
  '<script src="https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>'
);

// Babel is no longer needed in the browser.
page = page.replace(
  '<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>\n',
  ''
);

// Surface failures on screen. Without this a thrown error leaves an empty root
// and the page just looks black.
const errorOverlay = [
  '<script>',
  '(function () {',
  '  function show(msg) {',
  '    var r = document.getElementById("root");',
  '    if (!r) return;',
  '    r.innerHTML = "<pre style=\\"color:#fca5a5;padding:20px;white-space:pre-wrap;" +',
  '      "font:13px/1.5 ui-monospace,monospace\\">" + String(msg) + "</pre>";',
  '  }',
  '  window.addEventListener("error", function (e) {',
  '    show((e.message || "Error") + "\\n" + (e.filename || "") + ":" + (e.lineno || ""));',
  '  });',
  '  window.addEventListener("unhandledrejection", function (e) {',
  '    show("Unhandled promise rejection:\\n" + ((e.reason && e.reason.message) || e.reason));',
  '  });',
  '  window.addEventListener("DOMContentLoaded", function () {',
  '    setTimeout(function () {',
  '      var r = document.getElementById("root");',
  '      if (r && !r.children.length) {',
  '        var missing = [];',
  '        if (!window.React) missing.push("React");',
  '        if (!window.ReactDOM) missing.push("ReactDOM");',
  '        if (!window.supabase) missing.push("supabase-js");',
  '        show(missing.length',
  '          ? "Failed to load from CDN: " + missing.join(", ")',
  '          : "Scripts loaded but nothing rendered.");',
  '      }',
  '    }, 4000);',
  '  });',
  '})();',
  '</script>'
].join('\n');

page = page.replace('</head>', errorOverlay + '\n</head>');

// Compile the JSX ahead of time.
const scriptRe = /<script type="text\/babel" data-presets="react">([\s\S]*?)<\/script>/;
const match = page.match(scriptRe);
if (!match) {
  console.error('Could not find the JSX script block');
  process.exit(1);
}

// runtime: 'classic' is essential. The automatic runtime emits
// `import { jsx } from "react/jsx-runtime"`, a bare ES module specifier that
// throws immediately inside a classic <script> and leaves a blank page.
// Classic compiles to React.createElement, which the UMD global provides.
const compiled = babel.transform(match[1], {
  presets: [['react', { runtime: 'classic' }]],
  compact: false
}).code;

if (/from\s+["']react\/jsx-runtime["']/.test(compiled) || !/createElement/.test(compiled)) {
  console.error('Compiled output is not usable in a classic script');
  process.exit(1);
}

page = page.replace(scriptRe, '<script>\n' + compiled + '\n</script>');

fs.writeFileSync(OUT, page.endsWith('\n') ? page : page + '\n');
console.log('Wrote index.html:', page.length, 'chars (JSX compiled ahead of time)');
