// Grid state slice for persisting AG Grid filter and column state

export interface GridState {
  filterModel: Record<string, any> | null;
  columnState: any[] | null;
}

type GridCreator = (s: GridState, ...rest: any) => unknown;
type GridCreators = Record<string, GridCreator>;
type GridReducer = (s: GridState, ...rest: any) => GridState;
type GridReducers = Record<string, GridReducer>;

interface SliceConfig {
  name: string;
  reducers: GridReducers;
  creators: GridCreators;
  initialState: GridState;
}

const initialState: GridState = {
  filterModel: null,
  columnState: null,
};

const creators: GridCreators = {
  setGridState: (filterModel, columnState) => ({ filterModel, columnState }),
  clearGridState: () => ({ filterModel: null, columnState: null }),
};

const reducers: GridReducers = {
  setGridState: (s, { filterModel, columnState }) => ({
    ...s,
    filterModel: filterModel ?? null,
    columnState: columnState ?? null,
  }),
  clearGridState: (s) => ({
    ...s,
    filterModel: null,
    columnState: null,
  }),
};

export const sliceConfig: SliceConfig = {
  name: 'grid',
  creators,
  initialState,
  reducers,
};

