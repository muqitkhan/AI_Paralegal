interface FooterProps {
  dark?: boolean;
  className?: string;
}

export default function Footer({ dark = false, className = "" }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={`border-t px-6 py-4 ${
        dark
          ? "border-white/10 bg-slate-950/50 text-slate-300"
          : "border-slate-200 bg-white text-slate-500"
      } ${className}`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 text-sm">
        <p>© {year} AI Paralegal. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span className={dark ? "text-slate-400" : "text-slate-400"}>Secure • Private • Reliable</span>
        </div>
      </div>
    </footer>
  );
}