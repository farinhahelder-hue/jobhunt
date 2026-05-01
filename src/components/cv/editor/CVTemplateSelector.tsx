'use client';

import React from 'react';
import { FrenchStandard } from '../templates/FrenchStandard';
import { FrenchModern } from '../templates/FrenchModern';
import { FrenchMinimal } from '../templates/FrenchMinimal';

export type CVTemplateType = 'standard' | 'modern' | 'minimal';

interface CVTemplateSelectorProps {
  selected: CVTemplateType;
  onChange: (template: CVTemplateType) => void;
}

const templates: { id: CVTemplateType; name: string; preview: React.ReactNode }[] = [
  {
    id: 'standard',
    name: 'Classic',
    preview: (
      <div className="template-preview">
        <div className="border-b mb-2 text-xs font-bold">HEADER</div>
        <div className="grid grid-cols-3 gap-1">
          <div className="col-span-1 bg-gray-200 h-8" />
          <div className="col-span-2 bg-gray-100 h-8" />
        </div>
      </div>
    ),
  },
  {
    id: 'modern',
    name: 'Moderne',
    preview: (
      <div className="template-preview">
        <div className="bg-blue-600 text-white text-xs p-1">HEADER</div>
        <div className="mt-1 grid grid-cols-2 gap-1">
          <div className="bg-blue-200 h-4" />
          <div className="bg-blue-100 h-4" />
        </div>
      </div>
    ),
  },
  {
    id: 'minimal',
    name: 'ATS',
    preview: (
      <div className="template-preview">
        <div className="border-b-2 border-black mb-2 text-xs font-bold uppercase">HEADER</div>
        <div className="text-xs">Content...</div>
      </div>
    ),
  },
];

export function CVTemplateSelector({ selected, onChange }: CVTemplateSelectorProps) {
  return (
    <div className="cv-template-selector mb-6">
      <h3 className="font-medium text-gray-700 mb-3">Template</h3>
      <div className="flex gap-3">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onChange(template.id)}
            className={`template-option p-3 border-2 rounded-lg transition-all ${
              selected === template.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="w-24 h-16 mb-2 bg-white">{template.preview}</div>
            <div className="text-sm font-medium">{template.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Export the templates for rendering in preview
export const templateComponents = {
  standard: FrenchStandard,
  modern: FrenchModern,
  minimal: FrenchMinimal,
};