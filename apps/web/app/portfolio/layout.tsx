export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[500px] bg-[#020617] min-h-screen relative shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}
