import { Link } from "react-router";
import chevronLeft from "../../assets/icons/chevron-left.svg";
import { paths } from "../../helpers/constants";

export function BackToMarkets() {
  return (
    <Link
      to={paths.markets()}
      className="inline-flex items-center gap-1 rounded-sm text-sm leading-[normal] font-medium text-text-muted transition-colors duration-120 hover:text-text-primary max-sm:gap-0.5 max-sm:text-[15px] max-sm:text-text-secondary"
    >
      <img src={chevronLeft} alt="" width={16} height={16} />
      Markets
    </Link>
  );
}
