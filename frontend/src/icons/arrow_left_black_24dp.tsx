import * as React from "react";

function SvgArrowLeftBlack24Dp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="24px"
      viewBox="0 0 24 24"
      width="24px"
      fill="#000000"
      {...props}
    >
      <path d="M24 0v24H0V0h24z" fill="none" opacity={0.87} />
      <path d="M14 7l-5 5 5 5V7z" />
    </svg>
  );
}

export default SvgArrowLeftBlack24Dp;
