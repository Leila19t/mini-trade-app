export function StockRowSkeleton() {
  const block = "shrink-0 bg-bg-subtle";

  return (
    <li
      aria-hidden
      className="flex h-16 animate-pulse items-center gap-4 border-b border-border-default px-5 last:border-b-0 motion-reduce:animate-none max-sm:gap-3 max-sm:px-4"
    >
      <span className={`${block} size-5 rounded-sm`} />
      <span className={`${block} size-9 rounded-full max-sm:size-8`} />
      <span className="flex w-65 min-w-0 shrink flex-col gap-2">
        <span className={`${block} h-3 w-18 rounded-md`} />
        <span className={`${block} h-2.5 w-35 max-w-full rounded-md`} />
      </span>
      <span className={`${block} h-6 w-25 rounded-md max-md:hidden`} />
      <span className="flex-1" />
      <span className={`${block} h-3.5 w-22.5 rounded-md max-sm:w-16`} />
      <span className={`${block} h-7 w-24 rounded-md max-sm:hidden`} />
    </li>
  );
}
