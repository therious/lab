import React from 'react';
import styled from 'styled-components';

import {Modal} from "@therious/components";
import {MyGrid} from "./MyGrid";
import {columnDefsMap} from "./xform/columndefs";
import { securityLightConfig, sec2, securityLightPlantUml} from "./fsm-configs/security-light";
import {umlHeartbeatSubscription,heartbeatXStateConfig} from './fsm-configs/subscription';
import {stateForms} from "./InjectedStateForms";

const palette = {
      plum: '#4b54a1',
      black: '#0c0e0d',
      blueslate: '#465f73',
      slate: '#5f5f7b',
      drab: '#b1c3a9',
      sky: '#5e86ba',
      moon: '#b3961e',
      midnight: '#0b2383',

      gold: 'gold',
      cornsilk: 'cornsilk',
      blue: 'blue',
      forest: 'forestgreen',
      crimson: 'crimson'
};

const Layout = styled.div`
    display:grid;
    height: calc(100vh);
    width: calc(100vw);
    
    row-gap:4px;
    column-gap:4px;

    grid-template-columns: ${props=>props.left}px minmax(0, 1fr) ${props=>props.right}px;
    grid-template-rows: 30px minmax(0, 1fr) 30px;
    grid-template-areas: "Navbar Navbar Navbar"
                         "Left CenterBody Right"
                         "Footer Footer Footer";    
`;

Layout.defaultProps = {left:200, right:100};

const Navbar = styled.section`
    padding: 4px;
    grid-area: Navbar;
    background-color: ${palette.midnight};
    color: ${palette.drab};
`;
const Footer = styled.section`
    grid-row-start:3; 
    grid-column-start:1; grid-column-end:4;
    background-color: ${palette.blueslate};
    color: ${palette.drab};
`;

const CenterBody = styled.section`
    display: block;
    height:100%;
    grid-area: CenterBody;
    background-color: ${palette.drab};
    color: ${palette.black};
`;
const Left = styled.section`
    grid-area: Left;
    background-color: ${palette.cornsilk};
    color: ${palette.midnight};
`;
const Right = styled.section`
    grid-area: Right;
    background-color: ${palette.cornsilk};
    color: ${palette.midnight};
`;

const Button = styled.button`
  padding-top: 2px;
  padding-bottom: 2px;
  margin: 2px 10px;
`

const somejsx = <div>Hello<br/>There</div>;

const closef=()=>console.warn('closing');




const gridMap = {
    Trades: 'aTrades',
    Quotes: 'aQuotes',
    Parties: 'aParties'
};

function nthTime(f,n)
{
    var counter = 0;
    return function()
    {
        console.log(counter);
        return (++counter === n)?
            f.apply(this, arguments): undefined;
    }


}

const getData = nthTime(function(props){
   props.actions.omsPartyList();
    props.actions.omsQuoteList();
    props.actions.omsTradeList();
}, 1);

let interval;

const  App = props => {

   getData(props);

   const {left,right} = props.layout;
   const {pickGrid, omsTradeList, omsQuoteList, toggleLeft,toggleRight} = props.actions;
   const rowDataProp = props.pickGrid;
   const rowData = props[gridMap[rowDataProp]]||[];
   const columnDefs =  columnDefsMap[rowDataProp];

   console.info(`props for grid are ${rowDataProp}`, columnDefs, rowData);

   const modalContent = `hello`;

   return  (
        <Layout left={left} right={right}>
          {/*<Modal content={modalContent}/>*/}
            <Navbar>
                {/*<button onClick={()=>{pickGrid('Trades');  clearInterval(interval);setInterval(omsTradeList, 1000)}}>Trades</button>*/}
                {/*<button onClick={()=>{pickGrid('Quotes'); clearInterval(interval); interval = setInterval(omsQuoteList, 1000)}}>Quotes</button>*/}
                {/*<button onClick={()=>{pickGrid('Parties'); clearInterval(interval);}}>Parties</button>*/}
                <Button onClick={()=>{toggleLeft(100)}}>Left</Button>
                <Button onClick={()=>{toggleRight(300)}}>Right</Button>

            </Navbar>
            <Left>In left side bar?</Left>
            <CenterBody>
              {stateForms()}

              {/*<MyGrid rowData={rowData} columnDefs={columnDefs}/>*/}

            </CenterBody>
            <Right>In right sidebar?</Right>
            <Footer>Status stuff is over here</Footer>
        </Layout>
    );
};


export default App;
