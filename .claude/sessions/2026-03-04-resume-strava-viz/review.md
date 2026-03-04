# Review — athlete merge fix in `lib/db/sync.ts`

## Context

The fix addresses `db.athlete.put()` wiping user-set fields (`age`, `dateOfBirth`) on every re-sync. The approach: read the existing record first, spread it as a base, then overlay only the Strava-provided fields.

---

## Findings

### Correctness

[Praise] `lib/db/sync.ts:39-46` — The core intent is correct. Spreading `existingAthlete` as the base before overlaying Strava fields means `age`, `dateOfBirth`, `access_token`, `refresh_token`, and `token_expires_at` are all preserved across re-syncs, not just the two fields mentioned in the comment.

[Blocker] `lib/db/sync.ts:44` — The `sex` fallback logic is subtly wrong.

```ts
sex: ((athleteData.sex as 'M' | 'F') || existingAthlete?.sex) as 'M' | 'F',
```

This `||` is unnecessary. `athleteData.sex` will be `'M'` or `'F'` (truthy strings) when present, so the fallback will never trigger for a valid Strava response. But when Strava returns `null` or `undefined` for `sex` (which it does for athletes who have not set their gender — this is a real Strava API behaviour), the `||` falls through to `existingAthlete?.sex`. That part works.

However, the field is also being spread in via `...(existingAthlete ?? {})` on line 40, so `sex` is already being preserved from the existing record before line 44 overwrites it. The explicit `sex` line therefore has two effects:

1. When Strava returns a valid sex, it correctly overwrites the spread value.
2. When Strava returns null/undefined, `|| existingAthlete?.sex` correctly re-applies the existing value — but this is redundant, because the spread already put it there.

This is not a bug, but the redundancy is confusing. More importantly, the type cast `as 'M' | 'F'` on the outer expression silently accepts `undefined` (first sync, no existing record, Strava returns null) and coerces it to `undefined` while the type annotation says it will always be `'M' | 'F'`. Dexie will store `undefined` in that field without error, and any downstream code reading `athlete.sex` expecting a string will get `undefined`. The `Athlete` type marks `sex` as required (`sex: 'M' | 'F'`), so this is a type-safety hole.

Suggested fix: handle the null case explicitly and store `undefined` as an optional field, or broaden the type to `sex?: 'M' | 'F'` and accept that it may be absent.

---

### Edge cases

[Praise] `lib/db/sync.ts:40` — First sync is handled correctly. `existingAthlete` is `undefined`, `?? {}` substitutes an empty object, and the spread is a no-op. The explicit `id`, `firstname`, `lastname`, `sex`, and `last_synced` fields are then set normally.

[Important] `lib/db/sync.ts:39-46` — Athlete account change is not handled. If a user disconnects their Strava account and reconnects with a different athlete ID, `db.athlete.get(athleteData.id)` returns `undefined` (new ID, no record), so the merge is a no-op and the old athlete record remains in the table. This is a pre-existing problem rather than a regression introduced by this fix, but the merge path now makes it slightly more invisible since the intent of the block is to manage the record lifecycle. Worth noting, not a blocker.

[Minor] `lib/db/sync.ts:37` — The double cast `as Record<string, unknown>` is already present in the file and consistent with the pattern used elsewhere (e.g. line 85). Not ideal, but not a regression.

---

### Regressions

None introduced. The logic path for `firstname`, `lastname`, and `last_synced` is unchanged in effect. The rest of the file (`syncStreamsForActivity`, `getAccessToken`, the activity sync loop) is untouched.

---

### Code quality

[Minor] `lib/db/sync.ts:40` — `...(existingAthlete ?? {})` works but `existingAthlete` is typed as `Athlete | undefined` by Dexie's `Table.get()` return type. An explicit `...(existingAthlete || {})` or a guard `if (existingAthlete)` read slightly more clearly, though `??` is correct here since `existingAthlete` will never be `0` or `''`. This is a very minor point.

[Praise] The comment on line 36 is accurate and helpful — it names exactly what is being preserved and why, which is the right level of documentation for this kind of merge.

The structure (read → merge → put) is idiomatic for Dexie and consistent with how the rest of the file interacts with the DB.

---

## Summary

The fix achieves its stated goal. `age` and `dateOfBirth` are correctly preserved across re-syncs. The one issue worth addressing before merging is the `sex` field: the type cast hides a potential `undefined` value on first sync when Strava returns no gender, which violates the `Athlete` type contract and could silently break downstream consumers.

**Needs changes** (one blocker: `sex` type safety on first sync with no Strava gender set).
