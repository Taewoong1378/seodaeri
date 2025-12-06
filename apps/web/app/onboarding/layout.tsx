export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex justify-center">
      <div className="w-full max-w-[500px] bg-white min-h-screen relative shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}
