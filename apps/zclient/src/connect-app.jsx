import {initialState} from "./constants/initial-state";
import * as funcs from "./action-funcs";
import {applyMiddleware, bindActionCreators, combineReducers, createStore} from "redux";
import {composeWithDevTools} from "redux-devtools-extension";
import {getMiddleware, init} from "./example-redux-middleware";
import {createSelector} from "reselect";
import * as actionCreators from "./action-creators";
import {connect, Provider} from "react-redux";
import ZclientApp from "./ZclientApp";
import React from "react";
import {createRoot} from "react-dom/client";

import './index.css';

const actionstyle = `
    padding: 2px 8px;
    border: 1px solid black;
    background-color:plum;
    color: black;
    `;

function myreducer(state = initialState, action) {
  console.log(`%c +action - ${action.type}`, actionstyle, action);
  const actionf = funcs[action.type];
  return actionf? actionf(state,action): state;
}

const rootReducer = combineReducers({myreducer });

const store = createStore(
  rootReducer,
  composeWithDevTools(
    applyMiddleware(getMiddleware)
  )
);



// relect code here
const tradesSelector    = s => s.myreducer.trades;
const partiesSelector   = s => s.myreducer.parties;
const quotesSelector    = s => s.myreducer.quotes;

const aTradesSelector  = createSelector(tradesSelector, o=>Object.values(o).slice(-100));
const aQuotesSelector  = createSelector(quotesSelector, o=>Object.values(o));
const aPartiesSelector = createSelector(partiesSelector, o=>Object.values(o));


const mapStateToProps = state => {

  const aTrades  = aTradesSelector(state);
  const aQuotes  = aQuotesSelector(state);
  const aParties = aPartiesSelector(state);
  return {...state.myreducer, aTrades,aQuotes,aParties};
};


const mapDispatchToProps = dispatch => {
  const actions =  bindActionCreators(actionCreators, dispatch);
  init(actions);
  return { actions}
};

const ConnectedApp =  connect(
  mapStateToProps,
  mapDispatchToProps,
  null,
  { forwardRef: true } // must be supplied for react/redux when using Ag-Grid GridOptions.reactNext

)(ZclientApp);


export function connectApp()
{
  const root = createRoot(document.getElementById('root')); // createRoot(container!) if you use TypeScript

  root.render(<Provider store={store}><ConnectedApp/></Provider>);
}

