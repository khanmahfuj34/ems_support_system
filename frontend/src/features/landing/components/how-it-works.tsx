const STEPS = [
  {
    number: "1",
    step: "Step 01",
    title: "Create Your Account",
    description:
      "Simple verification for enrolled students, faculty, and academic guests using single institutional sign-on.",
  },
  {
    number: "2",
    step: "Step 02",
    title: "Access Your Learning Space",
    description:
      "Customize your course dashboard, learning tracks, and peer study groups according to your syllabus.",
  },
  {
    number: "3",
    step: "Step 03",
    title: "Get Help When You Need It",
    description:
      "Access integrated academic guidance and platform support anytime without interrupting your deep focus.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-8 lg:py-24 max-w-7xl mx-auto px-4 md:px-8">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs leading-4 uppercase tracking-wider font-bold text-[#5b3df0] dark:text-[#c4b5fd]">
          Simple Onboarding
        </span>
        <h2 className="text-[24px] leading-8 md:text-[36px] md:leading-[44px] font-bold tracking-[-0.015em] md:tracking-[-0.02em] text-[#140f35] dark:text-[#f8f9ff] mt-2 mb-4">
          A Streamlined Path to Academic Success
        </h2>
        <p className="text-sm leading-5 text-[#47464f] dark:text-[#d5e3fc]">
          Step into your personalized scholarly environment through three direct
          verification phases.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {STEPS.map((item) => (
          <div
            key={item.step}
            className="relative bg-white dark:bg-[#1e1b4b] p-8 rounded-xl border border-[#c8c5d0]/40 dark:border-[#787680]/20 text-left"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#7a5af8] to-[#5b3df0] text-white text-xl leading-7 font-bold flex items-center justify-center shadow-[0_4px_14px_rgba(122,90,248,0.35)]">
                {item.number}
              </div>
              <span className="text-xs leading-4 uppercase text-[#5b3df0] dark:text-[#c4b5fd] font-semibold">
                {item.step}
              </span>
            </div>
            <h3 className="text-xl leading-7 tracking-[-0.01em] font-semibold text-[#140f35] dark:text-[#f8f9ff] mb-2">
              {item.title}
            </h3>
            <p className="text-sm leading-5 text-[#47464f] dark:text-[#d5e3fc] leading-relaxed">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
