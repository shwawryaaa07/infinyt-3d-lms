import React from 'react';

export const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 animate-pulse">
    <div className="aspect-video bg-slate-200" />
    <div className="p-5 space-y-3">
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="h-3 bg-slate-100 rounded w-full" />
      <div className="h-3 bg-slate-100 rounded w-2/3" />
      <div className="h-2 bg-slate-100 rounded-full w-full mt-2" />
      <div className="h-9 bg-slate-100 rounded-full w-full mt-1" />
    </div>
  </div>
);
