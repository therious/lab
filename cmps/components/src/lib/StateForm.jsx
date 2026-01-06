import React, {useState} from 'react';
import styled, {css} from 'styled-components';
import {DagViewer} from "./DagViewer";

const solidBorder =css`
  border: 1px solid black;
`;

const elementText = css`
  font-size: 12px;
  font-weight: normal;
  color: black;
  padding: 3px;
`;

const containerPadding =css`
  padding: 2px;
`;

const FsmTag = styled.div`
  overflow-y: hidden;
  background-color: #fefefe;
  margin:           10px;
  padding:          10px;
  border:           1px solid #888;
  position:         relative;
  display:          flex;
  gap:              20px;
  transition:       width 0.3s ease, height 0.3s ease;
`;

const FsmFormSection = styled.div`
  flex: 0 0 auto;
  min-width: 0;
  max-width: 400px;
`;

const FsmDiagramSection = styled.div`
  flex: 1 1 auto;
  min-width: 400px;
  display: flex;
  flex-direction: column;
`;

const MachineName = styled.div`
  padding:          10px;
  font-size:        16px;
  font-weight:      bold;
`;


const StTag = styled.div`
  ${solidBorder};
  display: inline-grid;
  background-color: white;
  margin: 2px;
  border:           1px solid #333;
  border-radius: 50%;
  min-width: 40px;
  text-align:center ;
  ${elementText};
  padding: 4px;

  color: blue;
`;

const EvtTag = styled.button`
  ${solidBorder};
  border-radius: 6px;
  margin:2px;
  background-color: #abf;
  :hover {
    background-color: aqua;
  }
  ${elementText};
`;


const ContextTag = styled.div`
  margin: 5px auto;
  ${containerPadding};
  overflow: hidden;
`;

const ContextPair = styled.span`
  display:inline-block;
  margin-right: 3px;

  :not(:last-child) {
    padding-right: 10px;
    border-right: 1px dotted #aaa;
  }
`;

const ContextVarName = styled.span`
  ${elementText};

  color: black;
  text-align: right;
  display: inline;
  width: 200px;
  /* adjust the width; make sure the total of both is 100% */
  ::after { content: ":"};
`;

const ContextVarValue = styled.span`
  ${solidBorder};
  ${elementText};

  display: inline-block;
  color: mediumslateblue;
  min-width: 40px;
  width: auto;
  /* adjust the width; make sure the total of both is 100% */
  background: white;
`;

const SectionLabel = styled.span`
  display: inline-block;
  min-width: 60px;
  font-size: 12px;
  font-weight: bold;
  text-align: right;
  margin-right:12px;
  ::after {content: ":"}
`
const PaddedDiv = styled.div`
  ${containerPadding};
`;


const Context = ({context}) =>
  <ContextTag>
    <SectionLabel>Context</SectionLabel>
    {
      Object.entries(context).map(([k,v],i)=>
      <ContextPair key={i}>
        <ContextVarName>{k}</ContextVarName>
        <ContextVarValue>{v?.toString()||v}</ContextVarValue></ContextPair>)
    }
  </ContextTag>;


const extractEventTokens = (stConfig) => {
  const {states} = stConfig;
  const tokenSet = new Set();

  Object.values(states).forEach((sob)=>{
    Object.keys(sob.on || {}).forEach(k=>tokenSet.add(k))
  })
  return [...tokenSet];
}
export const  StateForm = ({expanded, stConfig, diagram}) => {

  const {id:machineName,states={},context={} } = stConfig;
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [formWidth, setFormWidth] = useState(800);
  const [showDiagram, setShowDiagram] = useState(true);

  const stateList = Object.keys(states);
  const evtTokens = extractEventTokens(stConfig);

  console.info(`Stateform ${stConfig.id} - `, stConfig);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  
  const handleResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = formWidth;
    
    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(400, Math.min(1200, startWidth + diff));
      setFormWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return(
    <FsmTag style={{
      width: isCollapsed ? '250px' : `${formWidth}px`,
      height: isCollapsed ? '60px' : 'auto',
      minHeight: isCollapsed ? '60px' : '500px',
    }}>
      <button
        onClick={toggleCollapse}
        style={{
          position: 'absolute',
          top: '5px',
          left: '5px',
          width: '24px',
          height: '24px',
          padding: 0,
          border: '1px solid #888',
          backgroundColor: '#fff',
          cursor: 'pointer',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? '▶' : '▼'}
      </button>
      
      {isCollapsed ? (
        <MachineName style={{textAlign: 'left', marginLeft: '30px', marginTop: '5px'}}>
          {machineName}
        </MachineName>
      ) : (
        <>
          <FsmFormSection>
            <MachineName style={{textAlign: 'left', marginTop: '30px'}}>{machineName}</MachineName>
            <hr/>
            <PaddedDiv>
              <SectionLabel>States</SectionLabel>
              {stateList.map((stName, i) => (<StTag key={i}>{stName}</StTag>))}
            </PaddedDiv>
            <hr/>
            <Context context={context}/>
            <hr/>
            <PaddedDiv>
              <SectionLabel>Events</SectionLabel>
              {evtTokens.map((evtName, i) => (<EvtTag key={i}>{evtName}</EvtTag>))}
            </PaddedDiv>
          </FsmFormSection>
          <FsmDiagramSection>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', marginBottom: '10px'}}>
              <h4 style={{margin: 0, fontSize: '14px'}}>{showDiagram ? 'Diagram' : 'Dot Source'}</h4>
              <button
                onClick={() => setShowDiagram(!showDiagram)}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  border: '1px solid #888',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                }}
                title={showDiagram ? 'Show dot source' : 'Show diagram'}
              >
                {showDiagram ? '📄' : '📊'}
              </button>
            </div>
            {showDiagram ? (
              <DagViewer dot={diagram} width={"100%"} height={"500px"}/>
            ) : (
              <textarea 
                readOnly={true} 
                value={diagram} 
                style={{
                  width: '100%', 
                  height: '500px', 
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '10px',
                  border: '1px solid #ccc',
                  backgroundColor: '#f9f9f9',
                  resize: 'none',
                }}
              />
            )}
          </FsmDiagramSection>
        </>
      )}
      
      {!isCollapsed && (
        <div
          onMouseDown={handleResize}
          style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: '20px',
            height: '20px',
            cursor: 'nwse-resize',
            backgroundColor: '#888',
            border: '1px solid #555',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
          title="Resize form"
        >
          <div style={{
            width: '0',
            height: '0',
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #fff',
            borderBottom: '6px solid #fff',
            transform: 'rotate(45deg)',
          }} />
        </div>
      )}
    </FsmTag>
  )
}
