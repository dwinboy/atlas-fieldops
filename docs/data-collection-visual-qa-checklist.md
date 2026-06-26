# Visual-QA checklist — new data-collection features

Everything below was implemented and **typecheck/test-verified, but not run on a device/browser**.
This checklist confirms each feature end-to-end. Work top-to-bottom; a form built in Part A is reused
in Parts B–C.

**Environment**
- Web: deploy the frontend (or run it) and sign in as an org admin / form designer.
- Mobile: `cd mobile && eas build --platform android --profile production-apk`, install the APK, sign
  in once online (downloads assigned work), then test offline where noted.
- Mark each row ✅ / ❌ and note the build SHA you tested.

---

## Part A — Web form builder

### A1. Repeat group with child questions (the "farm boundary per farm" case)
1. Add a **Repeat group** field. Open its settings → **Field** tab.
2. Under "Questions inside this repeat group", add: a **Text** ("Farm name") and a **Boundary (polygon)** ("Farm boundary"). Mark the boundary required.
- ✅ Expect: both child rows appear; type/required editable; no console errors.

### A2. Count-driven repeat
1. Add a **Number** field "How many farms?" (give it a variable name).
2. On the repeat group, set **"Number of items comes from"** → that number question.
- ✅ Expect: the dropdown lists only number/decimal questions; selection saves.

### A3. Nested repeats
1. Inside the repeat group's child editor, add a child of type **Repeat group (nested)**.
- ✅ Expect: an indented child-question editor appears for the nested group; you can add its own questions.

### A4. Lookup (search & pick)
1. Add a **Search & pick** field. Settings → "What the officer searches" → try **Registered records**, **Entity categories**, **Reference data**.
- ✅ Expect: the source selector saves per choice.

### A5. Other-specify + multi-select limits
1. On a single-select and a multi-select, open **Validation** tab.
2. Tick **Allow "Other (specify)"**. On the multi-select set **Min/Max selections** (e.g. min 1, max 3).
- ✅ Expect: settings persist.

### A6. Number decimals + unit
1. On a Number/Decimal field → Validation → set **Decimal places** = 2 and **Unit** = `ha`.
- ✅ Expect: settings persist.

### A7. Relative date default
1. On a Date field → Validation → tick **"Pre-fill today's date when the question opens"**.
- ✅ Expect: setting persists.

### A8. Multi-language
1. On several questions → **Field** tab → **Translations** → add a language (e.g. `French`).
2. Enter translated **label**, **help text**, and **option labels**; on a matrix, translated **row/column labels**.
- ✅ Expect: the language appears on every question's editor (shared); inputs save.

### A9. Searchable selects
1. Give a single-select **9+ options**.
- ✅ Expect: (verified on mobile in B) — just confirm options save here.

**Then: save/publish the form, assign it to a field officer, and sync the mobile app.**

---

## Part B — Mobile app (offline-first)

Sign in online once, confirm Home shows **"Ready for offline use"** with form/assignment counts, then
**enable airplane mode** for the offline checks.

### B1. Repeat group + polygon per farm (A1)
1. Open the form. Add 2–3 repeat rows; in each, map a **Farm boundary** (full-screen map).
- ✅ Expect: each row has its own polygon; walk/auto-trace + manual tap both work; point count shows.

### B2. Count-driven repeat (A2)
1. Answer "How many farms? → 3".
- ✅ Expect: **3 rows auto-appear**, each with the repeat's questions.
2. Change the answer to 5 → 2 more rows appear. Enter data in a row, then change the answer to 1.
- ✅ Expect: rows with data are **kept** (only empty trailing rows trimmed).

### B3. Nested repeats (A3)
- ✅ Expect: the nested repeat renders inside a row and can add its own sub-rows.

### B4. Lookup (A4)
1. Open the lookup question; search.
- ✅ Expect: list filters as you type; picking records the **readable name** (check it on the review screen / export, not a UUID).

### B5. Searchable select (A9)
1. Open the 9+-option select.
- ✅ Expect: a **search box** appears above the options and filters them.

### B6. Other-specify (A5)
1. On the select/multi-select, pick **"Other (specify)"**.
- ✅ Expect: a text box reveals; the typed value is stored/restored when you reopen the draft.

### B7. Multi-select limits (A5)
1. Select fewer than min / more than max.
- ✅ Expect: a validation error on submit ("Select at least/at most N").

### B8. Number decimals + unit (A6)
1. Open the number question.
- ✅ Expect: the **unit (`ha`)** shows beside the input; entering 3 decimals fails validation.

### B9. Relative date default (A7)
1. Open the date question for the first time.
- ✅ Expect: **today's date is pre-filled**; you can change it.

### B10. Multi-language (A8)
1. Tap the **language chips** at the top of the form (Default / French / …).
- ✅ Expect: question labels, help text, **option labels**, and **matrix row/column labels** switch language; "Default" shows the base text.

### B11. Offline collection + sync
1. Submit a few records offline → check the **Sync queue** count rises.
2. Re-enable connectivity → **Full sync**.
- ✅ Expect: queue drains to zero; Online/Offline chip is accurate; "Last synced" updates.

### B12. Returned-for-correction
1. (After a supervisor returns one — Part C) open the **bell** (unread badge) / Drafts.
- ✅ Expect: the returned item + reviewer note appear; tapping it reopens the form with prior answers; the officer is **not** logged out; resubmit re-queues.

---

## Part C — Web review, mapping & export

### C1. Submission review + sector terminology
1. Open a submitted record in Submissions.
- ✅ Expect: labels use the tenant's sector term (e.g. "Patient"/"Farmer", not "Beneficiary").

### C2. Polygon on the map + overlap
1. Open Mapping → Submission maps.
- ✅ Expect: captured **boundaries render as polygons** (not just dots); two overlapping farms show a **red/critical** polygon and a "Boundary overlap" note; the submission detail shows the **overlap banner**.

### C3. Flexible export
1. From a form (or Submissions → data explorer) → **Export data** / **More formats**.
- ✅ Expect: format menu is **data-aware** (GeoJSON/KML/Shapefile/GPX appear only when GPS/boundaries exist); **Columns** picker and **Scope** (status) filter work; CSV/Excel/JSON/GeoJSON/KML/GPX/Shapefile each download and open in the target tool (QGIS/Google Earth/Excel).
2. Export **"Data + media (.zip)"**.
- ✅ Expect: zip contains the data file(s) + `media/manifest.csv`; media files included when uploaded.

---

## Known limitations to confirm (expected, not bugs)
- Going **offline** is detected on the next failed request, not instantly (no `expo-network` yet).
- No background sync while the app is closed.
- Local data is **not encrypted at rest** yet (stub).
- Polygon overlap checks at most 500 candidate submissions.
See `docs/data-collection-native-infra-todo.md` for the fixes.
