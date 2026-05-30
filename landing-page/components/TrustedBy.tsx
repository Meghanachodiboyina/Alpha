'use client';

export default function TrustedBy() {
  const companies = ['Notion', 'Webflow', 'linear', 'loom', 'ramp', 'zapier'];

  return (
    <section className="py-16 border-t bg-gray-50">
      <div className="container">
        <p className="text-center text-10 font-bold uppercase tracking-wider text-muted mb-12 opacity-60">
          Trusted by teams at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-10 opacity-40 grayscale hover-grayscale-0 transition-all duration-700">
           {companies.map((company) => (
             <div key={company} className="flex items-center gap-2 cursor-default hover-scale-105 transition-transform">
                <div className="w-7 h-7 bg-muted-10 rounded flex items-center justify-center font-bold text-xs">
                  {company[0].toUpperCase()}
                </div>
                <span className="font-bold text-xl tracking-tighter lowercase">{company}</span>
             </div>
           ))}
        </div>
      </div>
    </section>
  );
}
