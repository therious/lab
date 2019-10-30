import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware, combineReducers, bindActionCreators} from 'redux'
import { Provider, connect } from 'react-redux'
import { composeWithDevTools } from 'redux-devtools-extension';
import {createSelector} from 'reselect';

import './index.css';
import App from './App';
import {initialState} from "./constants/initial-state";
import * as actionCreators from './action-creators'
import * as funcs from './action-funcs';
import {getMiddleware, init} from "./example-redux-middleware";

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

const aTradesSelector  = createSelector(tradesSelector, o=>Object.values(o));
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

)(App);

render(
    <Provider store={store}>
        <ConnectedApp/>
    </Provider>,
    document.getElementById('root')
);

