import {useState, useLayoutEffect, useRef} from 'react';
import {Network, Options, Data, Edge, Node} from "vis-network/standalone/esm/vis-network";

export type UseVisNetworkOptions = { options: Options; nodes: Node[]; edges: Edge[]; }

export const useVisNetwork = (props: UseVisNetworkOptions) =>
{
  const { edges, nodes, options } = props;

  const [network, setNetwork] = useState<Network | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) {
      const instance = new Network(ref.current, {nodes, edges}, options);
      setNetwork(instance);
    }
    return () => network?.destroy();
  }, [nodes, edges]);

  return { network, ref };
};
