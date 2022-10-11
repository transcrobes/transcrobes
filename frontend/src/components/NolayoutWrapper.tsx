import CustomUserMenu from "../layout/CustomUserMenu";
import { AbstractWorkerProxy } from "../lib/proxies";
import { AppBar } from "../components/AppBar";
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
    <Box>
      <AppBar title={title} userMenu={userMenu ? <CustomUserMenu proxy={proxy} /> : false}>
        {menuChildren}
      </AppBar>
      {children}
    </Box>
  );
}
