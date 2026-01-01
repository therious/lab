# Documentation Cleanup Plan

## Analysis Summary

### Current Implementation
- **Three-tier tie system**: statistical, peculiar, ambiguous
- **Notation**: Numbers (1, 2, 3) with * for peculiar, † for ambiguous
- **Winner ordering**: Fully implemented with `winner_order` field

### Documentation Status

#### ✅ Keep and Update
1. **WINNER_ORDERING_DATA_STRUCTURE.md** (formerly WINNER_ORDERING_NOTATION.md) - Update to three-tier system with * and †
2. **ALGORITHM_FAILURE_ANALYSIS.md** - Still relevant
3. **MULTIPLE_WINNERS_ANALYSIS.md** - Still relevant
4. **MULTIPLE_WINNERS_IMPLEMENTATION_PLAN.md** - Future plan, still relevant
5. **IRV_STV_IMPLEMENTATION_ANALYSIS.md** - Still relevant
6. **COOMBS_IMPLEMENTATION_ANALYSIS.md** - Still relevant
7. **REPO_ARCHITECTURE_OPTIONS.md** - Documents decision, still relevant
8. **TENNESSEE_CAPITAL_TEST_PLAN.md** - Future plan, still relevant

#### ❌ Remove (Historical/Obsolete)
1. **PLANNED_TIE_CATEGORIZATION.md** - Feature is implemented, plan is obsolete
2. **STATISTICAL_TIE_VS_AMBIGUOUS_ANALYSIS.md** - Historical two-category discussion, obsolete
3. **WINNER_ORDERING_FEATURE_PLAN.md** - Feature is implemented, plan is obsolete
4. **AMBIGUOUS_ORDERING_VS_INDETERMINATE_RESULTS.md** - Historical discussion, mostly obsolete

#### ⚠️ Review (May be obsolete)
1. **WINNER_ORDERING_ANALYSIS.md** - May have outdated info, needs review
2. **VOTES_MIGRATION.md** - May be obsolete if migration complete
3. **ISSUES_AND_FIXES.md** - Historical, but may be useful reference

#### ❓ Present for Decision
1. **IRV_VS_STV_FAILURE_ANALYSIS.md** - Need to check if this duplicates other docs
2. **TESTING.md** - Check if this is referenced and still useful
3. **DATABASE_INSPECTION.md** - Check if still relevant
4. **MONITORING.md** - Check if still relevant
5. **AGENTS.md** - Check if still relevant
6. **SQLITE_CONNECTION.md** - Check if still relevant

## Actions

### Immediate (Clear)
1. Delete obsolete plan documents
2. Update WINNER_ORDERING_DATA_STRUCTURE.md to reflect implementation
3. Update READMEs to link to all relevant docs

### Review Needed
- Check if VOTES_MIGRATION.md is still relevant
- Check if ISSUES_AND_FIXES.md should be kept as historical reference
- Review WINNER_ORDERING_ANALYSIS.md for outdated content

