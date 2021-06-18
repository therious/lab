import React from 'react';
import styled from 'styled-components';


const StateContent = styled.div`
  background-color: #fefefe;
  margin:           10px auto; /* 15% from the top and centered */
  padding:          10px;
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


const ContextDiv = styled.dl`
  width: 100%;
  overflow: hidden;
  background: #ff0;
  padding: 0;
  margin: 0
`;
const VarName = styled.dt`
  color: darkred;
  float: left;
  width: 50%;
  /* adjust the width; make sure the total of both is 100% */
  background: #cc0;
  padding: 0;
  margin: 0

`;

const VarValue = styled.dd`
  color: mediumslateblue;
  float: left;
  width: 50%;
  /* adjust the width; make sure the total of both is 100% */
  background: #dd0;
  padding: 0;
  margin: 0
`;


const ContextVars = ({context}) =>
<dl>
    {Object.entries(context).map(([k,v])=><><VarName>{k}</VarName><VarValue>{v}</VarValue></>)}
</dl>;


const extractEventTokens = (stConfig) => {
    const {states} = stConfig;
    const tokenSet = new Set();

    Object.entries(states).forEach(([stName,sob])=>{
        Object.keys(sob.on || {}).forEach(k=>tokenSet.add(k))
    })
    return [...tokenSet];
}
export const  StateForm = ({stConfig}) => {

    const {id:machineName,states={},context={}} = stConfig;

    const stateList = Object.keys(states);
    const evtTokens = extractEventTokens(stConfig);

  return(
      <StateContent>
          <MachineName>{machineName}</MachineName>
          <ContextVars context={context}/>
          <div>
            {stateList.map(stName=>(<StDiv>{stName}</StDiv>))}
          </div>
          <div>
            {evtTokens.map(evtName=>(<EvtDiv>{evtName}</EvtDiv>))}
          </div>
      </StateContent>
  )
}
