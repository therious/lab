import React,  {useState, useCallback, useRef, useEffect} from 'react';
import './App.css';
import {instance} from "@viz-js/viz";
import {stateForms} from "./InjectedStateForms";
import {DagViewer} from "./DagViewer";

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import {NeueModal} from '@therious/components';

const queryClient = new QueryClient();


// react-query compliant fetch function generator
const fetcherSvg = (url:string)=>async()=>{
  const viz = await instance();

  const response = await fetch(url);
  const exampleDoc = `digraph { could -> not -> find => "${url}" }`;

  const dotDocument:string = await response.text() ?? exampleDoc;
  const svg = viz.renderSVGElement(dotDocument,{graphAttributes: {ImageSize: {html: "width:100px, height:100px"}}});
  return svg;
}

const fetcherString =  (url:string)=>async()=>{
  const viz = await instance();

  const response = await fetch(url);
  const exampleDoc = `digraph { could -> not -> find => "${url}" }`;

  const dotDocument:string = await response.text() ?? exampleDoc;
  return dotDocument;
}

const diagramFetcher = fetcherString('/dot/physics.dot');

type AdapstSvgSvgProps = {svgsvg:SVGSVGElement}
function AdaptSvgSvg({svgsvg}:AdapstSvgSvgProps)
{
  const svg = useRef<HTMLDivElement>(null);
  useEffect(()=>{svg.current?.appendChild?.(svgsvg)},[svgsvg]);

  return (
    <div style={{maxWidth:'fit-content', maxHeight:'fit-content'}} ref={svg}/>
  );

}

function Example()
{
  const [modal, setModal] = useState<boolean>(false);
  const closeModal = useCallback(()=>setModal(false),[]);
  const openModal = useCallback(()=>setModal(true),[]);

  const { isPending, isError, data, error }  = useQuery({
    queryKey: ['diagram1'],
    queryFn: diagramFetcher
  });
  if(!isPending && !isError)
    console.log(`svg data received = `, data);

  const contextMenu = useCallback((e:any) => {  // todo fix  type of event
    e.preventDefault(); // prevent the default behaviour when right clicked
    console.log("Right Click");
  },[]);

  return (
    <div className="App" onContextMenu={contextMenu}>
      <button disabled={modal} onClick={openModal}>Trigger modal</button>
      <NeueModal openIt={modal} close={closeModal}><h1>Wow</h1><p>Hello this is an extensive message</p><button onClick={closeModal}>Close me</button></NeueModal>

      <hr/>
      <div style={{
        display: 'block',
        width: 'fit-content',
        height: 'fit-content',
        border: '5px dotted red',
        marginBottom: '20px',
      }}>
        {stateForms()}
      </div>

      <div style={{
        width: '100%',
        height: '70vh',
        minHeight: '500px',
        border: '2px solid blue',
        margin: '20px 0',
        padding: '10px',
        boxSizing: 'border-box',
      }}>
        <h3>Physics Diagram (from /dot/physics.dot)</h3>
        {isPending ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><span>Loading...</span></div> : 
         isError ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'red' }}><span>Error: {error.message}</span></div> :
          data ? <DagViewer dot={data} height={"calc(100% - 40px)"} width={"100%"}/> :
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'orange' }}>
            <span>No data available</span>
          </div>
        }
      </div>
      
      <div style={{
        width: '100%',
        height: '70vh',
        minHeight: '500px',
        border: '2px solid green',
        margin: '20px 0',
        padding: '10px',
        boxSizing: 'border-box',
      }}>
        <h3>Test Diagram (hardcoded)</h3>
        <DagViewer 
          dot={`digraph {
  rankdir=LR;
  node [shape=circle style=filled];
  A [fillcolor=lightblue];
  B [fillcolor=lightgreen];
  C [fillcolor=lightyellow];
  A -> B [label="step 1"];
  B -> C [label="step 2"];
  C -> A [label="step 3"];
}`} 
          height={"calc(100% - 40px)"} 
          width={"100%"}
        />
      </div>
    </div>
  );

}

//... todo add a query client provide
function GraphicApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <Example/>
    </QueryClientProvider>
  );
}

export default GraphicApp;
