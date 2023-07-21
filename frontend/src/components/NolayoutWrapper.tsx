import { Box } from "@mui/material";
import { DataManager } from "../data/types";
import CustomUserMenu from "../layout/CustomUserMenu";
import { CustomAppBar } from "./CustomAppBar";

type Props = {
  children?: React.ReactNode;
  menuChildren?: React.ReactNode;
  userMenu?: boolean;
  proxy: DataManager;
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
