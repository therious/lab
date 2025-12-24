import type { ColDef, ValueGetterParams, ITooltipParams } from 'ag-grid-community';
import { definitionFilterMatcher } from '../agstuff/DefinitionFilterMatcher';
import { getRootTooltipSync, getDictionaryWords } from '../roots/loadDictionary';
import type { RootData } from '../roots/types';

type AbbreviatedColDef = {
  f: string; // field
  h?: string; // header (Hebrew)
  maxWidth?: number;
  width?: number;
  flex?: number;
  minWidth?: number;
  comparator?: (num1: number, num2: number) => number;
  filter?: string;
  filterParams?: { textMatcher: (params: { filterOption: string; value: unknown; filterText: string }) => boolean };
  floatingFilterComponent?: string;
  floatingFilter?: boolean;
  floatingFilterComponentParams?: { suppressFilterButton: boolean };
  valueGetter?: (params: ValueGetterParams<RootData>) => string;
  cellRenderer?: string;
  cellStyle?: Record<string, string>;
};

const defCol: Partial<ColDef<RootData>> = {
    sortable: true,
    filter: true,
    enableCellChangeFlash: true,
    tooltipValueGetter: (params: ITooltipParams<RootData>): string | undefined => {
        // For the 'r' (root) column, show dictionary words in tooltip
        const colDef = params.colDef as ColDef<RootData>;
        if (colDef?.field === 'r' && params.data) {
            const rootId = params.data.id;
            const definition = params.data.d || '';
            return getRootTooltipSync(rootId, definition);
        }
        // For 'd' (definition) column, also show dictionary words
        if (colDef?.field === 'd' && params.data) {
            const rootId = params.data.id;
            const definition = params.data.d || '';
            return getRootTooltipSync(rootId, definition);
        }
        // Default: return cell value
        return params.value != null ? String(params.value) : undefined;
    },
};

const numberSort = (num1: number, num2: number): number => {
    return num1 - num2;
};

// Custom text matcher for single-character columns (P, E, L)
// Matches if the cell value (single character) is contained in the filter string (multiple characters)
// AG Grid v34 textMatcher receives: { filterOption, value, filterText }
type TextMatcherParams = {
  filterOption: string;
  value: unknown;
  filterText: string;
};

const singleCharTextMatcher = ({ filterOption, value, filterText }: TextMatcherParams): boolean => {
    if (!filterText) return true; // Empty filter shows all rows
    if (!value) return false;
    
    const filterStr = String(filterText);
    const cellValue = String(value);
    
    // Check if the single character in the cell is contained in the filter string
    return filterStr.includes(cellValue);
};

function toAgColDef(v: string | AbbreviatedColDef): ColDef<RootData> {
    if (typeof v === 'string') {
       return {...defCol, headerName: v.toUpperCase(), field: v} as ColDef<RootData>;
    }

    const o: Partial<ColDef<RootData>> = {...v};

    // Merge cellStyle instead of replacing it
    // Add faint border on the right (left in RTL) to separate columns
    o.cellStyle = {
        fontSize: '18px', 
        borderRight: '1px solid rgba(128, 128, 128, 0.2)', // Faint gray border
        ...(o.cellStyle || {})
    };
    
    // Also add border to header (CSS will handle this via class)
    o.headerClass = 'ag-header-cell-with-border';

    o.headerName = ((o as AbbreviatedColDef).h || (o as AbbreviatedColDef).f || '').toUpperCase();
    o.field = (o as AbbreviatedColDef).f as keyof RootData;
    delete (o as any).f;
    delete (o as any).h;

    return {...defCol, ...o} as ColDef<RootData>;
}

// Value getter for examples column - formats all examples for filtering
const examplesValueGetter = (params: ValueGetterParams<RootData>): string => {
  if (!params.data || !params.data.id) {
    return '';
  }
  const words = getDictionaryWords(params.data.id);
  if (words.length === 0) {
    return '';
  }
  // Format: Hebrew (part of speech): English
  return words.map(word => {
    const partOfSpeech = word.t ? ` (${word.t})` : '';
    return `${word.h}${partOfSpeech}: ${word.e}`;
  }).join(' | ');
};

const rootsColumns: AbbreviatedColDef[] = [
   {f:'id', maxWidth:65, comparator:numberSort, filter: 'agTextColumnFilter', floatingFilterComponent: 'ltrFloatingFilter'},
   {f: 'r', h:'שרש', maxWidth:75, filter: 'agTextColumnFilter', floatingFilterComponent: 'hebrewFloatingFilter'},
   {f:'P', h:'פ', maxWidth:50, filter: 'agTextColumnFilter', filterParams: { textMatcher: singleCharTextMatcher }, floatingFilterComponent: 'hebrewFloatingFilter'},
   {f:'E', h:'ע', maxWidth:50, filter: 'agTextColumnFilter', filterParams: { textMatcher: singleCharTextMatcher }, floatingFilterComponent: 'hebrewFloatingFilter'},
   {f:'L', h:'ל', maxWidth:50, filter: 'agTextColumnFilter', filterParams: { textMatcher: singleCharTextMatcher }, floatingFilterComponent: 'hebrewFloatingFilter'},
   {f:'d', h: 'definition', width:500, maxWidth:2000, filter: 'agTextColumnFilter', filterParams: { textMatcher: definitionFilterMatcher }, floatingFilterComponent: 'ltrFloatingFilter'},
   {f:'examples', h:'examples', flex:1, minWidth:200,
    valueGetter: examplesValueGetter,
    cellRenderer: 'examplesCellRendererSingleLine', // Default to single-line, will be updated dynamically
    filter: 'agTextColumnFilter', 
    filterParams: { textMatcher: definitionFilterMatcher }, 
    floatingFilterComponent: 'ltrFloatingFilter'},

].map(o=>({...o, floatingFilter: true, floatingFilterComponentParams: { suppressFilterButton: true }} as AbbreviatedColDef));

export const rootsColumnDefs = rootsColumns.map(o=>toAgColDef(o)); // xform abbrievated column definitions to AgGrid spec columnDefinitions

// Function to create column defs with dynamic cell renderer
export const createRootsColumnDefs = (multiLineExamples: boolean = false): ColDef<RootData>[] => {
  return rootsColumns.map(o => {
    const colDef = toAgColDef(o);
    // Update examples column cell renderer based on multiLineExamples
    if (colDef.field === 'examples') {
      colDef.cellRenderer = multiLineExamples ? 'examplesCellRendererMultiLine' : 'examplesCellRendererSingleLine';
      // Enable auto-height for multi-line mode
      if (multiLineExamples) {
        colDef.autoHeight = true;
      } else {
        colDef.autoHeight = false;
      }
    }
    return colDef;
  });
};
