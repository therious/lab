import { definitionFilterMatcher } from '../agstuff/DefinitionFilterMatcher';
import { getRootTooltipSync } from '../roots/loadDictionary';

const defCol = {
    sortable:true,
    filter:true,
    enableCellChangeFlash:true,
    tooltipValueGetter: (params) => {
        // For the 'r' (root) column, show dictionary words in tooltip
        if (params.colDef?.field === 'r' && params.data) {
            const rootId = params.data.id;
            const definition = params.data.d || '';
            return getRootTooltipSync(rootId, definition);
        }
        // For 'd' (definition) column, also show dictionary words
        if (params.colDef?.field === 'd' && params.data) {
            const rootId = params.data.id;
            const definition = params.data.d || '';
            return getRootTooltipSync(rootId, definition);
        }
        // Default: return cell value
        return params.value;
    },
};

const numberSort = (num1, num2) => {
    return num1 - num2;
};

// Custom text matcher for single-character columns (P, E, L)
// Matches if the cell value (single character) is contained in the filter string (multiple characters)
// AG Grid v34 textMatcher receives: { filterOption, value, filterText }
const singleCharTextMatcher = ({ filterOption, value, filterText }) => {
    if (!filterText) return true; // Empty filter shows all rows
    if (!value) return false;
    
    const filterStr = String(filterText);
    const cellValue = String(value);
    
    // Check if the single character in the cell is contained in the filter string
    return filterStr.includes(cellValue);
};

function toAgColDef(v) {

    if(typeof v === 'string')
       return {...defCol, headerName:v.toUpperCase(), field:v};

    const o = {...v};

    // Merge cellStyle instead of replacing it
    o.cellStyle = {fontSize: '18px', ...(o.cellStyle || {})};

    o.headerName = (o.h||o.f).toUpperCase();
    o.field = o.f;
    delete o.f;
    delete o.h;

    return {...defCol, ...o};

}

 const rootsColumns = [
   {f:'id',maxWidth:65, comparator:numberSort, filter: 'agTextColumnFilter', floatingFilterComponent: 'ltrFloatingFilter'},
   {f: 'r', h:'שרש', maxWidth:75, filter: 'agTextColumnFilter', floatingFilterComponent: 'hebrewFloatingFilter'},
   {f:'P', h:'פ', maxWidth:50, filter: 'agTextColumnFilter', filterParams: { textMatcher: singleCharTextMatcher }, floatingFilterComponent: 'hebrewFloatingFilter'},
   {f:'E', h:'ע', maxWidth:50, filter: 'agTextColumnFilter', filterParams: { textMatcher: singleCharTextMatcher }, floatingFilterComponent: 'hebrewFloatingFilter'},
   {f:'L', h:'ל', maxWidth:50, filter: 'agTextColumnFilter', filterParams: { textMatcher: singleCharTextMatcher }, floatingFilterComponent: 'hebrewFloatingFilter'},
   {f:'d', h: 'definition', width:500, maxWidth:2000, filter: 'agTextColumnFilter', filterParams: { textMatcher: definitionFilterMatcher }, floatingFilterComponent: 'ltrFloatingFilter'}, //valueFormatter:vfMidiNote

 ].map(o=>({...o, floatingFilter: true, floatingFilterComponentParams: { suppressFilterButton: true }}));



export const rootsColumnDefs = rootsColumns.map(o=>toAgColDef(o)); // xform abbrievated column definitions to AgGrid spec columnDefinitions
