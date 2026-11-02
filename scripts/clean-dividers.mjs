import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function walk(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'scripts') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) results.push(...walk(full))
    else if (full.endsWith('.ts') || full.endsWith('.tsx')) results.push(full)
  }
  return results
}

let totalRemoved = 0

for (const file of walk('.')) {
  const original = readFileSync(file, 'utf8')
  let text = original

  // Remove ═══ triple-line section dividers: // ═══\n// LABEL\n// ═══
  text = text.replace(/\/\/ ═+\r?\n\/\/ ([A-Z &,]+)\r?\n\/\/ ═+/g, '// $1')

  // Remove ── box-drawing inline section headers: // ── LABEL ────
  text = text.replace(/\/\/ [─\u2500\u2014]+ ([A-Z &]+) [─\u2500\u2014]+/g, '// $1')

  // Trim trailing doc-block verbosity: "/** \n * file.ts\n * Description\n */"
  // Collapse to single-line if it's just a file description
  text = text.replace(/\/\*\*\n \* ([\w./]+)\n \* (.+)\n \* Path structure: .+\n \*\//g, '// $1 — $2')

  if (text !== original) {
    writeFileSync(file, text, 'utf8')
    const removed = original.length - text.length
    totalRemoved += removed
    console.log(`  cleaned ${file} (-${removed} chars)`)
  }
}

console.log(`\nTotal removed: ${totalRemoved} chars`)

