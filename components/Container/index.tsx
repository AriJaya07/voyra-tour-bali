import clsx from 'clsx';

export default function Container({ className, children }: { className?: string, children: React.ReactNode }) {

  return (
    <div
      className={clsx(
        'mx-auto h-full w-full px-[15px] sm:px-[30px] relative',
        className,
        'max-w-[1280px] 2xl:px-0',
      )}
    >
      {children}
    </div>
  );
}
