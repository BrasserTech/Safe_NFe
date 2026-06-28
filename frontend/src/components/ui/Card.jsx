import React from "react";

export function Card({ title, value, icon: Icon, children, accent = "bg-skysoft text-ocean" }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      {(title || Icon) && (
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            {value && <strong className="mt-1 block text-2xl text-navy">{value}</strong>}
          </div>
          {Icon && (
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-md ${accent}`}>
              <Icon size={22} />
            </span>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
