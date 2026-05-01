'use client';

import React from 'react';
import { CVData } from './FrenchStandard';

interface FrenchModernProps {
  data: CVData;
}

export function FrenchModern({ data }: FrenchModernProps) {
  return (
    <div className="cv-template french-modern max-w-4xl mx-auto bg-white text-gray-900" style={{ minHeight: '1123px', padding: '40px' }}>
      {/* Header with colored background */}
      <div className="cv-header bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 -mx-8 -mt-8 mb-6">
        <h1 className="text-3xl font-bold">{data.personal_info?.full_name || 'Your Name'}</h1>
        <div className="flex flex-wrap gap-4 mt-3 text-blue-100">
          {data.personal_info?.email && <span>{data.personal_info.email}</span>}
          {data.personal_info?.phone && <span>{data.personal_info.phone}</span>}
          {data.personal_info?.location && <span>{data.personal_info.location}</span>}
        </div>
        <div className="flex gap-4 mt-2 text-blue-100">
          {data.personal_info?.linkedin_url && (
            <a href={data.personal_info.linkedin_url} className="underline hover:text-white">LinkedIn</a>
          )}
          {data.personal_info?.portfolio_url && (
            <a href={data.personal_info.portfolio_url} className="underline hover:text-white">Portfolio</a>
          )}
        </div>
      </div>

      {data.summary && (
        <div className="cv-section mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700">{data.summary}</p>
        </div>
      )}

      {/* Skills with progress bars */}
      {data.skills && data.skills.length > 0 && (
        <div className="cv-section mb-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-3">Skills</h2>
          <div className="grid grid-cols-2 gap-3">
            {data.skills.slice(0, 8).map((skill, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full" 
                    style={{ width: `${85 - idx * 5}%` }}
                  />
                </div>
                <span className="text-sm text-gray-700 w-24 truncate">{skill}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Experience */}
      {data.experiences && data.experiences.length > 0 && (
        <div className="cv-section mb-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-3">Experience</h2>
          {data.experiences.map((exp, idx) => (
            <div key={idx} className="mb-4 pl-4 border-l-4 border-blue-200">
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-gray-800">{exp.title}</h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {exp.start_date} - {exp.end_date || 'Present'}
                </span>
              </div>
              <p className="text-blue-600 font-medium">{exp.company}</p>
              {exp.description && (
                <p className="text-gray-600 mt-1 text-sm">{exp.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.educations && data.educations.length > 0 && (
        <div className="cv-section mb-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-3">Education</h2>
          {data.educations.map((edu, idx) => (
            <div key={idx} className="mb-3">
              <div className="flex justify-between">
                <h3 className="font-medium text-gray-800">{edu.degree} {edu.field && `in ${edu.field}`}</h3>
                {edu.graduation_date && (
                  <span className="text-sm text-gray-500">{edu.graduation_date}</span>
                )}
              </div>
              <p className="text-gray-600">{edu.institution}</p>
            </div>
          ))}
        </div>
      )}

      {/* Languages */}
      {data.languages && data.languages.length > 0 && (
        <div className="cv-section">
          <h2 className="text-xl font-semibold text-blue-800 mb-3">Languages</h2>
          <div className="flex gap-4">
            {data.languages.map((lang, idx) => (
              <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {lang.language} - {lang.level}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}