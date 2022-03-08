import { createContext } from "react";
import { DEFAULT_READER_CONFIG_STATE, ReaderState } from "../lib/types";

interface ConfigProviderProps {
  readerConfig: ReaderState;
}

const defaultState = {
  readerConfig: DEFAULT_READER_CONFIG_STATE,
};

export const ReaderConfigContext = createContext<ConfigProviderProps>(defaultState);

export default function ReaderConfigProvider({ readerConfig, children }: React.PropsWithChildren<ConfigProviderProps>) {
  return (
    <ReaderConfigContext.Provider
      value={{
        readerConfig,
      }}
    >
      {children}
    </ReaderConfigContext.Provider>
  );
}
