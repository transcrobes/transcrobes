import { createUseStyles } from "react-jss";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { ETFStyles } from "../components/Common";
import { AppDispatch, RootState } from "./createStore";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useJssStyles = createUseStyles(ETFStyles);
