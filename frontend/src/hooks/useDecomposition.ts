import { useState, useEffect } from "react";
import { buildSubstrings } from "../lib/funclib";
import { platformHelper } from "../lib/proxies";
import { DefinitionType, TokenType } from "../lib/types";

export default function useDecomposition(graph: string) {
  const [decomp, setDecomp] = useState<Map<string, DefinitionType>>();
  const [subs, setSubs] = useState<Map<string, DefinitionType>>();
  useEffect(() => {
    const substrings = buildSubstrings(graph);
    if (substrings.length > 0) {
      (async () => {
        const defs = await platformHelper.sendMessagePromise<DefinitionType[]>({
          source: "Substrings.tsx",
          type: "getWordsByGraphs",
          value: {
            graphs: substrings,
          },
        });
        const ldecom = new Map<string, DefinitionType>();
        const lsubs = new Map<string, DefinitionType>();
        for (const def of defs) {
          if (def.graph.length === 1) {
            ldecom.set(def.graph, def);
          } else if (def.graph.length < graph.length) {
            lsubs.set(def.graph, def);
          }
        }
        setDecomp(ldecom);
        setSubs(lsubs);
      })();
    }
  }, [graph]);

  return [decomp, subs];
}
