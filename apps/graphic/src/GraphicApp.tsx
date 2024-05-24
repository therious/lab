import React,  {useState, useCallback, useRef, useEffect} from 'react';
import './App.css';
import { instance, RenderError,RenderOptions, RenderResult } from "@viz-js/viz";
import {DagViewer} from './components/DagViewer';
import {actions, useSelector} from './actions-integration';
import {stateForms} from "./InjectedStateForms";

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

  return (
    <div className="App">
      <button disabled={modal} onClick={openModal}>Trigger modal</button>
      <NeueModal openIt={modal} close={closeModal}><h1>Wow</h1><p>Hello this is an extensive message</p><button onClick={closeModal}>Close me</button></NeueModal>

      <hr/>
      <div style={{
        display: 'block',
        width: 'fit-content',
        height: 'fit-content',
        border: '5px dotted red',
      }}>
        {stateForms()}

        {/*{isPending ? <span>Loading...</span> : isError ? <span>Error: {error.message}</span> :*/}
        {/*  <DagViewer dot={data} height={"100vh"} width={"100vw"}/>*/}
        {/*  // <AdaptSvgSvg svgsvg={data}/>*/}
        {/*}*/}
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
