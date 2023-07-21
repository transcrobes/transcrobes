import { UserMenu } from "react-admin";
import Logout from "./Logout";
import type { DataManager } from "../data/types";

export default function CustomUserMenu({ proxy }: { proxy: DataManager }) {
  return (
    <UserMenu>
      <Logout button proxy={proxy} />
    </UserMenu>
  );
}
