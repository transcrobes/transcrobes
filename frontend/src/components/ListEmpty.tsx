import { Box } from "@mui/system";
import { ReactElement } from "react";
import { Empty, ListToolbar } from "react-admin";

interface Props {
  actions: ReactElement | false;
  createDisabled?: boolean;
  children?: React.ReactNode;
}

export function ListEmpty({ actions, children, createDisabled }: Props) {
  return (
    <Box
      sx={{
        width: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
        }}
      >
        <ListToolbar actions={actions} />
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Empty hasCreate={!createDisabled} />
        {children}
      </Box>
    </Box>
  );
}
