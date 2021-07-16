import React, { useRef } from "react";
import Popup from "reactjs-popup";
import { FaBars } from "react-icons/fa";
import styled from "styled-components";

export const StyledPopup = styled(Popup)`
  &-content[role="tooltip"] {
    width: 250px;
  }
`;

export interface Props extends React.SVGAttributes<SVGElement> {
  open: boolean;
}

export const ConfigButton = React.forwardRef<HTMLDivElement, Props>(({ open, ...props }, ref) => (
  // FIXME: understand why the popup goes to the right if the width isn't set!
  <div style={{ width: "2em", paddingBottom: "8px" }} ref={ref}>
    <FaBars {...props}> </FaBars>
  </div>
));
