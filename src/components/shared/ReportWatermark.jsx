// ─── REPORT WATERMARK ─────────────────────────────────────────────────────────
// Wrap any generated report content with this to apply watermark + no-select

export default function ReportWatermark({ children, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      {/* Watermark overlay — subtle, non-intrusive */}
      <div
        className="absolute inset-0 pointer-events-none flex items-end justify-end p-3 z-10"
        aria-hidden="true"
      >
        <span className="text-[9px] text-muted-foreground/20 font-mono select-none rotate-[-15deg] absolute bottom-4 right-4 whitespace-nowrap">
          Confidential — VEU AI Studio — FlowAI v0.1
        </span>
      </div>
      {/* Content with user-select disabled */}
      <div className="select-none">
        {children}
      </div>
    </div>
  );
}