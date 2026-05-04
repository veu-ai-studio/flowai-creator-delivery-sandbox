import { useState, useEffect } from 'react';

const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'CTO at Buildstack',
    avatar: 'SC',
    color: 'bg-blue-500',
    quote: 'FlowAI cut our AI pipeline setup from 2 weeks to 2 hours. The multi-model routing alone is worth every penny.',
    stars: 5,
  },
  {
    name: 'Marcus Reid',
    role: 'Founder at Promptly',
    avatar: 'MR',
    color: 'bg-purple-500',
    quote: 'The visual flow designer is incredibly intuitive. We shipped our first autonomous agent pipeline in a single afternoon.',
    stars: 5,
  },
  {
    name: 'Aisha Okonkwo',
    role: 'Lead Engineer at NovaTech',
    avatar: 'AO',
    color: 'bg-emerald-500',
    quote: "The automated QA audits caught 3 critical issues before production. It's like having a senior QA engineer on standby 24/7.",
    stars: 5,
  },
  {
    name: 'James Whitfield',
    role: 'Product Manager at Orbital',
    avatar: 'JW',
    color: 'bg-cyan-500',
    quote: 'We replaced 4 different tools with FlowAI. The orchestration layer is genuinely best-in-class.',
    stars: 5,
  },
];

export default function TestimonialCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const t = TESTIMONIALS[active];

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Loved by builders</h2>
          <p className="text-gray-400">Join thousands of teams shipping faster with FlowAI.</p>
        </div>

        {/* Main card */}
        <div className="relative rounded-2xl border border-white/8 bg-white/3 p-10 text-center min-h-[220px] flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/5 blur-[80px] rounded-full" />
          </div>

          {/* Stars */}
          <div className="flex gap-1 mb-5">
            {Array.from({ length: t.stars }).map((_, i) => (
              <svg key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>

          <p className="text-lg md:text-xl text-gray-200 leading-relaxed mb-6 max-w-2xl relative">
            "{t.quote}"
          </p>

          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full ${t.color} flex items-center justify-center text-white text-sm font-bold`}>
              {t.avatar}
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white">{t.name}</p>
              <p className="text-xs text-gray-400">{t.role}</p>
            </div>
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-2 rounded-full transition-all ${i === active ? 'w-6 bg-blue-500' : 'w-2 bg-white/20'}`}
            />
          ))}
        </div>

        {/* Nav arrows */}
        <div className="flex justify-center gap-3 mt-4">
          <button
            onClick={() => setActive(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
            className="h-9 w-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setActive(i => (i + 1) % TESTIMONIALS.length)}
            className="h-9 w-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}