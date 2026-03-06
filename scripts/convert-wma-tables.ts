/**
 * One-shot script: converts the official WMA 2015 road-running CSV to lib/wma/tables.json.
 *
 * Usage:
 *   npx tsx scripts/convert-wma-tables.ts path/to/wma2015.csv
 *
 * The CSV is expected to have one row per age per sex per distance.
 * Update COLUMNS below to match the actual column layout of your file.
 *
 * Expected output shape:
 * {
 *   "version": "WMA 2015",
 *   "distances": [1609, 5000, 10000, 15000, 20000, 21097, 25000, 30000, 42195],
 *   "worldRecordSeconds": {
 *     "M": { "1609": 223.13, "5000": 755.36, ... },
 *     "F": { "1609": 252.33, "5000": 846.62, ... }
 *   },
 *   "factors": {
 *     "M": { "1609": { "35": 0.9970, "36": 0.9952, ... }, ... },
 *     "F": { ... }
 *   }
 * }
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

// ---------------------------------------------------------------------------
// COLUMNS — update these indices to match your CSV file's actual layout.
// ---------------------------------------------------------------------------
const COLUMNS = {
  sex: 0,           // Column index for sex ('M' or 'F', or 'Men'/'Women' etc.)
  age: 1,           // Column index for age (integer)
  distance: 2,      // Column index for distance (metres, or a label — see DISTANCE_MAP)
  factor: 3,        // Column index for the age-grade factor (0.0–1.2)
}

// If the distance column contains labels rather than numbers, map them here.
// Otherwise, leave empty and the parser will parse the column as a number.
const DISTANCE_LABEL_MAP: Record<string, number> = {
  '1 Mile':    1609,
  '1mile':     1609,
  '1M':        1609,
  '5K':        5000,
  '5k':        5000,
  '10K':       10000,
  '10k':       10000,
  '15K':       15000,
  '15k':       15000,
  '20K':       20000,
  '20k':       20000,
  'Half Mar':  21097,
  'HM':        21097,
  '25K':       25000,
  '25k':       25000,
  '30K':       30000,
  '30k':       30000,
  'Marathon':  42195,
  'Mar':       42195,
  'marathon':  42195,
}

// Sex column value normalisation
const SEX_MAP: Record<string, 'M' | 'F'> = {
  M: 'M', m: 'M', Male: 'M', male: 'M', Men: 'M', men: 'M',
  F: 'F', f: 'F', Female: 'F', female: 'F', Women: 'F', women: 'F',
}

// Standard distances — only rows matching these distances are included
const STANDARD_DISTANCES = [1609, 5000, 10000, 15000, 20000, 21097, 25000, 30000, 42195]

// World record seconds — M and F open WR for each standard distance.
// These come from the WMA 2015 tables; update if your source provides different values.
const WORLD_RECORD_SECONDS: Record<'M' | 'F', Record<number, number>> = {
  M: {
    1609:  3 * 60 + 43.13,
    5000:  12 * 60 + 35.36,
    10000: 26 * 60 + 17.53,
    15000: 41 * 60 + 13,
    20000: 55 * 60 + 48,
    21097: 58 * 60 + 23,
    25000: 71 * 60 + 18,
    30000: 86 * 60 + 18,
    42195: 2 * 3600 + 0 * 60 + 35,
  },
  F: {
    1609:  4 * 60 + 12.33,
    5000:  14 * 60 + 6.62,
    10000: 29 * 60 + 17.45,
    15000: 46 * 60 + 14,
    20000: 62 * 60 + 19,
    21097: 65 * 60 + 47,
    25000: 79 * 60 + 42,
    30000: 96 * 60 + 13,
    42195: 2 * 3600 + 14 * 60 + 4,
  },
}

// ---------------------------------------------------------------------------

interface ParsedRow {
  sex: 'M' | 'F'
  age: number
  distance: number
  factor: number
}

function parseDistance(raw: string): number | null {
  const trimmed = raw.trim()
  if (DISTANCE_LABEL_MAP[trimmed] !== undefined) return DISTANCE_LABEL_MAP[trimmed]
  const n = Number(trimmed)
  if (!isNaN(n)) return n
  return null
}

function parseSex(raw: string): 'M' | 'F' | null {
  return SEX_MAP[raw.trim()] ?? null
}

async function parseCSV(filePath: string): Promise<ParsedRow[]> {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' })
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

  const rows: ParsedRow[] = []
  let lineNum = 0
  let skipped = 0

  for await (const line of rl) {
    lineNum++
    const cols = line.split(',').map((c) => c.trim())

    // Skip rows with fewer columns than needed
    const needed = Math.max(COLUMNS.sex, COLUMNS.age, COLUMNS.distance, COLUMNS.factor) + 1
    if (cols.length < needed) { skipped++; continue }

    const sex = parseSex(cols[COLUMNS.sex])
    if (sex === null) { skipped++; continue }

    const age = parseInt(cols[COLUMNS.age], 10)
    if (isNaN(age)) { skipped++; continue }

    const distance = parseDistance(cols[COLUMNS.distance])
    if (distance === null) { skipped++; continue }

    // Only include standard distances
    if (!STANDARD_DISTANCES.includes(distance)) { skipped++; continue }

    const factor = parseFloat(cols[COLUMNS.factor])
    if (isNaN(factor)) { skipped++; continue }

    rows.push({ sex, age, distance, factor })
  }

  console.log(`Parsed ${rows.length} rows from ${lineNum} lines (${skipped} skipped)`)
  return rows
}

function validate(rows: ParsedRow[]): void {
  const errors: string[] = []

  for (const row of rows) {
    if (!Number.isInteger(row.age)) errors.push(`Non-integer age: ${row.age}`)
    if (row.factor < 0.01 || row.factor > 2.0) {
      errors.push(`Factor out of range [0.01, 2.0]: sex=${row.sex} age=${row.age} dist=${row.distance} factor=${row.factor}`)
    }
    if (isNaN(row.factor)) errors.push(`NaN factor: sex=${row.sex} age=${row.age} dist=${row.distance}`)
  }

  // Check for expected coverage
  for (const sex of ['M', 'F'] as const) {
    for (const dist of STANDARD_DISTANCES) {
      const ageSet = new Set(rows.filter((r) => r.sex === sex && r.distance === dist).map((r) => r.age))
      if (ageSet.size === 0) errors.push(`No data: sex=${sex} dist=${dist}`)
    }
  }

  if (errors.length > 0) {
    console.error('Validation errors:')
    errors.forEach((e) => console.error(' ', e))
    process.exit(1)
  }
  console.log('Validation passed.')
}

function buildOutput(rows: ParsedRow[]) {
  const factors: Record<'M' | 'F', Record<string, Record<string, number>>> = { M: {}, F: {} }

  for (const sex of ['M', 'F'] as const) {
    for (const dist of STANDARD_DISTANCES) {
      const distKey = String(dist)
      factors[sex][distKey] = {}
      const distRows = rows.filter((r) => r.sex === sex && r.distance === dist)
      for (const row of distRows) {
        factors[sex][distKey][String(row.age)] = row.factor
      }
    }
  }

  // Convert WR seconds to string-keyed objects for JSON
  const wrM: Record<string, number> = {}
  const wrF: Record<string, number> = {}
  for (const dist of STANDARD_DISTANCES) {
    wrM[String(dist)] = WORLD_RECORD_SECONDS.M[dist]
    wrF[String(dist)] = WORLD_RECORD_SECONDS.F[dist]
  }

  return {
    version: 'WMA 2015',
    distances: STANDARD_DISTANCES,
    worldRecordSeconds: { M: wrM, F: wrF },
    factors,
  }
}

async function main() {
  const [, , csvPath] = process.argv
  if (!csvPath) {
    console.error('Usage: npx tsx scripts/convert-wma-tables.ts path/to/wma2015.csv')
    process.exit(1)
  }

  const absPath = path.resolve(csvPath)
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`)
    process.exit(1)
  }

  console.log(`Reading ${absPath}...`)
  const rows = await parseCSV(absPath)

  if (rows.length === 0) {
    console.error('No rows parsed. Check COLUMNS indices match your CSV layout.')
    process.exit(1)
  }

  validate(rows)

  const output = buildOutput(rows)
  const outPath = path.join(path.dirname(import.meta.url.replace('file://', '')), '..', 'lib', 'wma', 'tables.json')

  // Resolve relative to script location
  const resolvedOut = path.resolve(path.dirname(process.argv[1]), '..', 'lib', 'wma', 'tables.json')
  fs.writeFileSync(resolvedOut, JSON.stringify(output, null, 2))
  console.log(`Written: ${resolvedOut}`)

  // Summary
  for (const sex of ['M', 'F'] as const) {
    for (const dist of STANDARD_DISTANCES) {
      const ages = Object.keys(output.factors[sex][String(dist)]).map(Number)
      ages.sort((a, b) => a - b)
      console.log(`  ${sex} ${dist}m: ages ${ages[0]}–${ages[ages.length - 1]} (${ages.length} entries)`)
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
