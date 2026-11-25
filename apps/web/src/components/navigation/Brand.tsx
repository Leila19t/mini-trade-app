import { Link } from "react-router";
import logo from "../../assets/logo.svg";
import { paths } from "../../helpers/constants";

/** Logo + app name. Always links home. */
export function Brand() {
  return (
    <Link
      to={paths.markets()}
      className="inline-flex shrink-0 items-center gap-2.5 rounded-sm text-base font-bold whitespace-nowrap text-text-primary no-underline"
    >
      <img src={logo} alt="" width={24} height={24} />
      <span>Mini Trade</span>
    </Link>
  );
}
