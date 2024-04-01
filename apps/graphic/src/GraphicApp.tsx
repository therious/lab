import React,  {useCallback, useRef, useEffect} from 'react';
import './App.css';
import { instance, RenderError,RenderOptions, RenderResult } from "@viz-js/viz";
import {actions, useSelector} from './actions-integration';

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'

const queryClient = new QueryClient();


// react-query compliant fetch function generator
const fetcher = (url:string)=>async()=>{
  const viz = await instance();

  const response = await fetch(url);
  const exampleDoc = `digraph { could -> not -> find => "${url}" }`;

  const dotDocument:string = await response.text() ?? exampleDoc;
  const svg = viz.renderSVGElement(dotDocument,{graphAttributes: {ImageSize: {html: "width:100px, height:100px"}}});
  return svg;
}

const diagramFetcher = fetcher('/dot/pedigree.dot')

type AdapstSvgSvgProps = {svgsvg:SVGSVGElement}
function AdaptSvgSvg({svgsvg}:AdapstSvgSvgProps)
{
  const svg = useRef<HTMLDivElement>(null);
  useEffect(()=>{svg.current?.appendChild?.(svgsvg)},[]);

  return (
    <div style={{maxWidth:'1fr', maxHeight:'1fr', overflow: 'clip'}} ref={svg}/>
  );

}

function Example()
{
  const { isPending, isError, data, error }  = useQuery({
    queryKey: ['diagram1'],
    queryFn: diagramFetcher
  });
  if(!isPending && !isError)
    console.log(`svg data received = `, data);

  return (
      <div className="App">
        <button onClick={() => {alert('hi')}}>Reset Game</button>
        <hr/>
        <div style={{display:'block', width:'800px', height:'800px', border:'5px dotted red', overflowY:'clip', overflowX: 'clip'}}>
          {isPending ? <span>Loading...</span> : isError ? <span>Error: {error.message}</span> :
            <AdaptSvgSvg svgsvg={data}/>
            }
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
