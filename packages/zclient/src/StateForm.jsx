import React from 'react';
import styled from 'styled-components';


const StateContent = styled.div`
  background-color: #fefefe;
  margin:           15% auto; /* 15% from the top and centered */
  padding:          20px;
  border:           1px solid #888;
  width:            80%;
`;

const StDiv = styled.div`
  background-color: #cccccc;
  padding:         10px;
  border:           1px solid #333;
  color: blue;
  ::before {content: "St: "}
`;

const EvtDiv = styled.div`
  background-color: #abf;
  padding:         10px;
  border:           1px solid #333;
  color: green;
  ::before {content: "Evt: "}
`;

const MachineName = styled.div`
  padding:          10px;
  font-size:        16px;
  font-weight:      bold;
  ::before {content: "Machine: "}
`;
const extractEventTokens = (stConfig) => {
    const {states} = stConfig;
    const tokenSet = new Set();

    Object.entries(states).forEach(([stName,sob])=>{
        Object.keys(sob.on || {}).forEach(k=>tokenSet.add(k))
    })
    return [...tokenSet];
}
export const  StateForm = ({stConfig}) => {

    const {id:machineName,states} = stConfig;

    const stateList = Object.keys(states);
    const evtTokens = extractEventTokens(stConfig);

    console.log(stConfig);

  return(
      <StateContent>
          <MachineName>{machineName}</MachineName>
          <div>
            {stateList.map(stName=>(<StDiv>{stName}</StDiv>))}
          </div>
          <div>
            {evtTokens.map(evtName=>(<EvtDiv>{evtName}</EvtDiv>))}
          </div>
      </StateContent>
  )
}
