'use client';

import React from 'react';
import { CVData } from './FrenchStandard';

interface FrenchMinimalProps {
  data: CVData;
}

export function FrenchMinimal({ data }: FrenchMinimalProps) {
  return (
    <div className="cv-template french-minimal max-w-4xl mx-auto bg-white text-black" style={{ minHeight: '1123px', padding: '40px', fontFamily: 'Times New Roman, serif' }}>
      {/* Simple header - no colors, no background */}
      <div className="cv-header mb-6 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase tracking-wide">{data.personal_info?.full_name || 'YOUR NAME'}</h1>
        <div className="flex flex-wrap gap-3 mt-2 text-sm">
          {data.personal_info?.email && <span>{data.personal_info.email}</span>}
          {data.personal_info?.phone && <span>{data.personal_info.phone}</span>}
          {data.personal_info?.location && <span>{data.personal_info.location}</span>}
          {data.personal_info?.linkedin_url && <span>{data.personal_info.linkedin_url}</span>}
          {data.personal_info?.portfolio_url && <span>{data.personal_info.portfolio_url}</span>}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div className="cv-section mb-4">
          <h2 className="text-base font-bold uppercase tracking-wide mb-2">Professional Summary</h2>
          <p className="text-sm">{data.summary}</p>
        </div>
      )}

      {/* Experience - simple text, no bullets */}
      {data.experiences && data.experiences.length > 0 && (
        <div className="cv-section mb-4">
          <h2 className="text-base font-bold uppercase tracking-wide mb-2 border-b border-gray-400 pb-1">
            Professional Experience
          </h2>
          {data.experiences.map((exp, idx) => (
            <div key={idx} className="mb-3">
              <div className="flex justify-between text-sm">
                <span className="font-bold">{exp.title}</span>
                <span>{exp.start_date} - {exp.end_date || 'Present'}</span>
              </div>
              <div className="text-sm">{exp.company}</div>
              {exp.description && <div className="text-sm mt-1">{exp.description}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Education - simple text */}
      {data.educations && data.educations.length > 0 && (
        <div className="cv-section mb-4">
          <h2 className="text-base font-bold uppercase tracking-wide mb-2 border-b border-gray-400 pb-1">
            Education
          </h2>
          {data.educations.map((edu, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex justify-between text-sm">
                <span className="font-bold">{edu.degree}{edu.field && ` in ${edu.field}`}</span>
                {edu.graduation_date && <span>{edu.graduation_date}</span>}
              </div>
              <div className="text-sm">{edu.institution}</div>
            </div>
          ))}
        </div>
      )}

      {/* Skills - simple comma-separated list */}
      {data.skills && data.skills.length > 0 && (
        <div className="cv-section mb-4">
          <h2 className="text-base font-bold uppercase tracking-wide mb-2 border-b border-gray-400 pb-1">
            Technical Skills
          </h2>
          <p className="text-sm">{data.skills.join(', ')}</p>
        </div>
      )}

      {/* Languages - simple list */}
      {data.languages && data.languages.length > 0 && (
        <div className="cv-section">
          <h2 className="text-base font-bold uppercase tracking-wide mb-2 border-b border-gray-400 pb-1">
            Languages
          </h2>
          <ul className="text-sm list-disc list-inside">
            {data.languages.map((lang, idx) => (
              <li key={idx}>{lang.language}: {lang.level}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}