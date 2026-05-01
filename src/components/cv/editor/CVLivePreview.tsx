'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CVData } from '../templates/FrenchStandard';
import { CVTemplateType, templateComponents } from './CVTemplateSelector';

interface CVLivePreviewProps {
  data: CVData;
  template: CVTemplateType;
}

export function CVLivePreview({ data, template }: CVLivePreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (previewRef.current) {
      const contentHeight = previewRef.current.scrollHeight;
      setHeight(contentHeight);
      // A4 page is 1123px at 96dpi
      setIsOverLimit(contentHeight > 1123);
    }
  }, [data, template]);

  const TemplateComponent = templateComponents[template];

  return (
    <div className="cv-live-preview">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">Live Preview</span>
        <span
          className={`text-sm px-2 py-1 rounded ${
            isOverLimit ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {isOverLimit
            ? `Over limit: ${Math.round(height)}px (max 1123px)`
            : `${height}px / 1123px`}
        </span>
      </div>

      {/* A4 preview container */}
      <div className="bg-white shadow-lg mx-auto" style={{ width: '794px', minHeight: '1123px', transform: 'scale(0.85)', transformOrigin: 'top center' }}>
        <div ref={previewRef} id="cv-preview">
          <TemplateComponent data={data} />
        </div>
      </div>

      {isOverLimit && (
        <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded">
          ⚠️ Your CV exceeds one A4 page. Consider removing less relevant information.
        </div>
      )}
    </div>
  );
}