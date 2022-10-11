import { UserMenu } from "react-admin";
import { AbstractWorkerProxy } from "../lib/proxies";
import Logout from "./Logout";

export default function CustomUserMenu({ proxy }: { proxy: AbstractWorkerProxy }) {
  return (
    <UserMenu>
      <Logout button proxy={proxy} />
    </UserMenu>
  );
}
