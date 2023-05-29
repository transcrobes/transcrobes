import CustomUserMenu from "../layout/CustomUserMenu";
import { AbstractWorkerProxy } from "../lib/proxies";
import { CustomAppBar } from "./CustomAppBar";
import { Box } from "@mui/material";

type Props = {
  children?: React.ReactNode;
  menuChildren?: React.ReactNode;
  userMenu?: boolean;
  proxy: AbstractWorkerProxy;
  title?: string;
};

export default function NolayoutWrapper({ children, userMenu, proxy, menuChildren, title }: Props) {
  return (
    <Box sx={{ minHeight: "100vh" }}>
      <CustomAppBar title={title} userMenu={userMenu ? <CustomUserMenu proxy={proxy} /> : false}>
        {menuChildren}
      </CustomAppBar>
      {children}
    </Box>
  );
}
