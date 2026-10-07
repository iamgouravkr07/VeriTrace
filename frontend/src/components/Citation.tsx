import React from 'react';

export const Citation: React.FC<{ index: number; title?: string }> = ({ index, title }) => {
  return (
    <span
      className="inline-flex items-center text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 mx-0.5 align-middle select-none"
      title={title ? `Evidence: ${title}` : `Citation [${index}]`}
      aria-label={`Citation reference ${index}`}
    >
      [{index}]
    </span>
  );
};