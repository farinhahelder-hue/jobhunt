'use client';

import React from 'react';

export interface CVData {
  personal_info?: {
    full_name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin_url?: string;
    portfolio_url?: string;
  };
  summary?: string;
  experiences?: Array<{
    company?: string;
    title?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  }>;
  educations?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    graduation_date?: string;
  }>;
  skills?: string[];
  languages?: Array<{
    language?: string;
    level?: string;
  }>;
}

interface FrenchStandardProps {
  data: CVData;
}

export function FrenchStandard({ data }: FrenchStandardProps) {
  return (
    <div className="cv-template french-standard max-w-4xl mx-auto bg-white text-gray-900" style={{ minHeight: '1123px', padding: '40px' }}>
      <div className="cv-header mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{data.personal_info?.full_name || 'Your Name'}</h1>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
          {data.personal_info?.email && <span>{data.personal_info.email}</span>}
          {data.personal_info?.phone && <span>{data.personal_info.phone}</span>}
          {data.personal_info?.location && <span>{data.personal_info.location}</span>}
        </div>
        <div className="flex gap-4 mt-1 text-sm text-blue-600">
          {data.personal_info?.linkedin_url && (
            <a href={data.personal_info.linkedin_url} className="underline">LinkedIn</a>
          )}
          {data.personal_info?.portfolio_url && (
            <a href={data.personal_info.portfolio_url} className="underline">Portfolio</a>
          )}
        </div>
      </div>

      <div className="cv-columns flex gap-6">
        {/* Left sidebar */}
        <div className="cv-sidebar w-1/3 pr-4 border-r border-gray-200">
          {data.summary && (
            <div className="cv-section mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2 border-b border-gray-300 pb-1">Profile</h2>
              <p className="text-sm text-gray-600">{data.summary}</p>
            </div>
          )}

          {data.skills && data.skills.length > 0 && (
            <div className="cv-section mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2 border-b border-gray-300 pb-1">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {data.skills.map((skill, idx) => (
                  <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 text-xs rounded">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.languages && data.languages.length > 0 && (
            <div className="cv-section mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2 border-b border-gray-300 pb-1">Languages</h2>
              <ul className="text-sm">
                {data.languages.map((lang, idx) => (
                  <li key={idx} className="mb-1">
                    <span className="font-medium">{lang.language}</span>
                    <span className="text-gray-500"> - {lang.level}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.educations && data.educations.length > 0 && (
            <div className="cv-section mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2 border-b border-gray-300 pb-1">Education</h2>
              {data.educations.map((edu, idx) => (
                <div key={idx} className="mb-3">
                  <p className="font-medium text-gray-800">{edu.degree}</p>
                  <p className="text-sm text-gray-600">{edu.field}</p>
                  <p className="text-sm text-gray-500">{edu.institution}</p>
                  {edu.graduation_date && (
                    <p className="text-xs text-gray-400">{edu.graduation_date}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right content */}
        <div className="cv-main w-2/3 pl-4">
          {data.experiences && data.experiences.length > 0 && (
            <div className="cv-section mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2 border-b border-gray-300 pb-1">Experience</h2>
              {data.experiences.map((exp, idx) => (
                <div key={idx} className="mb-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-gray-800">{exp.title}</h3>
                    <span className="text-sm text-gray-500">
                      {exp.start_date} - {exp.end_date || 'Present'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{exp.company}</p>
                  {exp.description && (
                    <p className="text-sm text-gray-600 mt-1">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}