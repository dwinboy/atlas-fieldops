import React, { useState } from 'react';
import { ClipboardList, Users, ShieldAlert, CheckCircle2, ChevronRight, HardHat } from 'lucide-react';

export default function WorkflowSection() {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      title: 'Form Design',
      desc: 'Build systematic data-entry forms with advanced validations using FieldOps Forms Builder.',
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      title: 'Dispatch Assignment',
      desc: 'Deploy target sectors directly to active field units based on geographical and expertise constraints.',
      icon: <Users className="w-5 h-5" />,
    },
    {
      title: 'Field Capture',
      desc: 'Teams log structured surveys on-site, operating seamlessly in offline-first scenarios.',
      icon: <HardHat className="w-5 h-5" />,
    },
    {
      title: 'Verification',
      desc: 'Supervisor audit checks telemetry accuracy and resolves any data quality or sync issues.',
      icon: <ShieldAlert className="w-5 h-5" />,
    },
    {
      title: 'Official Decisive Sync',
      desc: 'Verified records are merged into the central system database for instant administrative action.',
      icon: <CheckCircle2 className="w-5 h-5" />,
    },
  ];

  return (
    <section className="bg-surface-lowest rounded-2xl border border-text-border shadow-shard p-6 lg:p-8">
      {/* Title block */}
      <div className="flex flex-col items-center text-center mb-8">
        <h3 className="text-xl lg:text-2xl font-extrabold text-text-main tracking-tight">
          Atlas FieldOps Workflow Process
        </h3>
        <p className="text-xs sm:text-sm text-text-outline max-w-xl mt-1">
          Streamlined precision field operations management. Designed for reliable data gathering.
        </p>
      </div>

      {/* Interactive Step Nodes */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 bg-surface-bg p-3 rounded-2xl border border-text-border/80">
        {steps.map((step, index) => {
          const isActive = activeStep === index;
          return (
            <button
              key={index}
              onClick={() => setActiveStep(index)}
              className={`
                flex flex-col items-center text-center p-3 rounded-xl transition-all duration-300 group relative
                ${isActive 
                  ? 'bg-white text-brand-primary shadow-xs ring-1 ring-brand-primary/15' 
                  : 'text-text-muted hover:text-text-main hover:bg-white/50'
                }
              `}
            >
              <div className={`
                p-2 rounded-xl mb-2 transition-transform duration-300 group-hover:scale-105
                ${isActive ? 'bg-brand-primary/10 text-brand-primary' : 'bg-surface-high/60 text-text-outline'}
              `}>
                {step.icon}
              </div>
              <span className="text-xs font-bold whitespace-nowrap">{step.title}</span>
              <span className="text-[9px] font-bold text-text-outline mt-0.5">Step 0{index + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Step Description panel */}
      <div className="p-4 bg-surface-low/30 border border-brand-primary/10 rounded-xl mb-8 flex items-start gap-3.5 transition-all duration-300">
        <div className="p-1.5 rounded-lg bg-brand-primary/10 text-brand-primary shrink-0 mt-0.5">
          <ChevronRight className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-text-main">
            {steps[activeStep].title} Details
          </h4>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            {steps[activeStep].desc}
          </p>
        </div>
      </div>

      {/* Infographic Image Wrapper */}
      <div className="w-full flex flex-col items-center border border-text-border/60 rounded-2xl p-4 bg-white shadow-xs">
        <div className="text-right w-full mb-2">
          <span className="text-[10px] font-bold bg-brand-primary-light/20 text-brand-primary px-2.5 py-1 rounded-full uppercase tracking-wide">
            Reference Map System
          </span>
        </div>
        <div className="relative group max-w-lg overflow-hidden rounded-xl border border-text-border/50">
          <img 
            className="max-w-full h-auto object-cover transition-transform duration-500 group-hover:scale-102"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNwhvLGIY7U2wjp1P1Dv3pxqVh0Un802uwrwQcgT7fq1vuwHmmJff_7QiN2IVBeefxJ7dNkPwPYvMBTCAO4nGSuhELZ-tYaE1kk5TrVTeYWnV7IanPaY7F4QVNvxlRmFDrIgh4CHSOVqtje9_dJyH2MKQXYzUeiSKI8NFATtCuFR3ixftzHTn6r82ebqQdzj-iYgZhviz835jCDA_y3obYrIxfx1FkwG2xdvJGBt4l9lL0tfPfZNo3J7bYqSAUBiU7xzPOgseI2A"
            alt="Technical workflow process outline map"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </section>
  );
}
