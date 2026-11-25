import google from "../../assets/icons/google.svg";

interface SignInButtonProps {
  onSignIn?: () => void;
}

/**
 * Signed-out state of the user menu: Google sign-in. The signed-in avatar comes with auth.
 * On phones it's icon-only; the label stays for screen readers.
 */
export function SignInButton({ onSignIn }: SignInButtonProps) {
  return (
    <button
      type="button"
      onClick={onSignIn}
      className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-border-strong bg-bg-surface py-2.25 pr-3.5 pl-3 text-sm leading-[normal] font-semibold whitespace-nowrap text-text-primary transition-colors duration-120 hover:bg-bg-subtle max-sm:p-2.5"
    >
      <img src={google} alt="" width={18} height={18} />
      <span className="max-sm:sr-only">Sign in</span>
    </button>
  );
}
