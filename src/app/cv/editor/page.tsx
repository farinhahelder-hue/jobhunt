'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CVData } from '@/components/cv/templates/FrenchStandard';
import { CVTemplateSelector, CVTemplateType } from '@/components/cv/editor/CVTemplateSelector';
import { CVLivePreview } from '@/components/cv/editor/CVLivePreview';
import { CVExportBar } from '@/components/cv/editor/CVExportBar';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CVEditorPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [template, setTemplate] = useState<CVTemplateType>('standard');
  const [data, setData] = useState<CVData>({
    personal_info: {},
    summary: '',
    experiences: [],
    educations: [],
    skills: [],
    languages: [],
  });

  // Load initial profile
  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (!error && profile) {
            setData({
              personal_info: {
                full_name: profile.full_name || '',
                email: profile.email || '',
                phone: profile.phone || '',
                location: profile.location || '',
                linkedin_url: profile.linkedin_url || '',
                portfolio_url: profile.portfolio_url || '',
              },
              summary: profile.resume_json?.summary || '',
              experiences: profile.resume_json?.experiences || [],
              educations: profile.resume_json?.educations || [],
              skills: profile.resume_json?.skills || [],
              languages: profile.resume_json?.languages || [],
            });
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();

    // Listen for resume import events
    const handleResumeImported = (e: CustomEvent) => {
      setData({
        personal_info: {
          full_name: e.detail.full_name || data.personal_info?.full_name,
          email: e.detail.email || data.personal_info?.email,
          phone: e.detail.phone || data.personal_info?.phone,
          location: e.detail.location || data.personal_info?.location,
          linkedin_url: e.detail.linkedin_url || data.personal_info?.linkedin_url,
          portfolio_url: e.detail.portfolio_url || data.personal_info?.portfolio_url,
        },
        summary: e.detail.resume_json?.summary || data.summary,
        experiences: e.detail.resume_json?.experiences || data.experiences,
        educations: e.detail.resume_json?.educations || data.educations,
        skills: e.detail.resume_json?.skills || data.skills,
        languages: e.detail.resume_json?.languages || data.languages,
      });
    };

    window.addEventListener('resume-imported', handleResumeImported as EventListener);
    return () => window.removeEventListener('resume-imported', handleResumeImported as EventListener);
  }, []);

  // Auto-save to Supabase
  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.id,
            full_name: data.personal_info?.full_name,
            email: data.personal_info?.email,
            phone: data.personal_info?.phone,
            location: data.personal_info?.location,
            linkedin_url: data.personal_info?.linkedin_url,
            portfolio_url: data.personal_info?.portfolio_url,
            resume_json: {
              summary: data.summary,
              experiences: data.experiences,
              educations: data.educations,
              skills: data.skills,
              languages: data.languages,
            },
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading) saveProfile();
    }, 1000);
    return () => clearTimeout(timer);
  }, [data]);

  const updatePersonalInfo = (field: string, value: string) => {
    setData(prev => ({
      ...prev,
      personal_info: {
        ...prev.personal_info,
        [field]: value,
      },
    }));
  };

  const addExperience = () => {
    setData(prev => ({
      ...prev,
      experiences: [
        ...(prev.experiences || []),
        { company: '', title: '', start_date: '', end_date: '', description: '' },
      ],
    }));
  };

  const updateExperience = (index: number, field: string, value: string) => {
    setData(prev => {
      const newExp = [...(prev.experiences || [])];
      newExp[index] = { ...newExp[index], [field]: value };
      return { ...prev, experiences: newExp };
    });
  };

  const removeExperience = (index: number) => {
    setData(prev => ({
      ...prev,
      experiences: (prev.experiences || []).filter((_, i) => i !== index),
    }));
  };

  const addEducation = () => {
    setData(prev => ({
      ...prev,
      educations: [
        ...(prev.educations || []),
        { institution: '', degree: '', field: '', graduation_date: '' },
      ],
    }));
  };

  const updateEducation = (index: number, field: string, value: string) => {
    setData(prev => {
      const newEdu = [...(prev.educations || [])];
      newEdu[index] = { ...newEdu[index], [field]: value };
      return { ...prev, educations: newEdu };
    });
  };

  const removeEducation = (index: number) => {
    setData(prev => ({
      ...prev,
      educations: (prev.educations || []).filter((_, i) => i !== index),
    }));
  };

  const updateSkills = (value: string) => {
    const skillsArray = value.split(',').map(s => s.trim()).filter(Boolean);
    setData(prev => ({ ...prev, skills: skillsArray }));
  };

  const addLanguage = () => {
    setData(prev => ({
      ...prev,
      languages: [
        ...(prev.languages || []),
        { language: '', level: '' },
      ],
    }));
  };

  const updateLanguage = (index: number, field: string, value: string) => {
    setData(prev => {
      const newLang = [...(prev.languages || [])];
      newLang[index] = { ...newLang[index], [field]: value };
      return { ...prev, languages: newLang };
    });
  };

  const removeLanguage = (index: number) => {
    setData(prev => ({
      ...prev,
      languages: (prev.languages || []).filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Left panel - form */}
      <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">CV Editor</h1>
            {isSaving && <span className="text-sm text-gray-400">Saving...</span>}
          </div>

          {/* Template selector */}
          <CVTemplateSelector selected={template} onChange={setTemplate} />

          {/* Personal Info */}
          <div className="cv-section mb-6">
            <h3 className="font-medium text-gray-700 mb-3">Personal Information</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Full Name"
                value={data.personal_info?.full_name || ''}
                onChange={(e) => updatePersonalInfo('full_name', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={data.personal_info?.email || ''}
                  onChange={(e) => updatePersonalInfo('email', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={data.personal_info?.phone || ''}
                  onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <input
                type="text"
                placeholder="Location"
                value={data.personal_info?.location || ''}
                onChange={(e) => updatePersonalInfo('location', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="url"
                  placeholder="LinkedIn URL"
                  value={data.personal_info?.linkedin_url || ''}
                  onChange={(e) => updatePersonalInfo('linkedin_url', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <input
                  type="url"
                  placeholder="Portfolio URL"
                  value={data.personal_info?.portfolio_url || ''}
                  onChange={(e) => updatePersonalInfo('portfolio_url', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="cv-section mb-6">
            <h3 className="font-medium text-gray-700 mb-3">Professional Summary</h3>
            <textarea
              placeholder="Brief summary of your professional background..."
              value={data.summary || ''}
              onChange={(e) => setData(prev => ({ ...prev, summary: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Experience */}
          <div className="cv-section mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">Experience</h3>
              <button
                onClick={addExperience}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add
              </button>
            </div>
            {(data.experiences || []).map((exp, idx) => (
              <div key={idx} className="mb-4 p-3 bg-white rounded border">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => removeExperience(idx)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Job Title"
                  value={exp.title || ''}
                  onChange={(e) => updateExperience(idx, 'title', e.target.value)}
                  className="w-full px-3 py-2 border rounded mb-2"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={exp.company || ''}
                  onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                  className="w-full px-3 py-2 border rounded mb-2"
                />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Start Date"
                    value={exp.start_date || ''}
                    onChange={(e) => updateExperience(idx, 'start_date', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                  <input
                    type="text"
                    placeholder="End Date"
                    value={exp.end_date || ''}
                    onChange={(e) => updateExperience(idx, 'end_date', e.target.value)}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>
                <textarea
                  placeholder="Description"
                  value={exp.description || ''}
                  onChange={(e) => updateExperience(idx, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            ))}
          </div>

          {/* Education */}
          <div className="cv-section mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">Education</h3>
              <button
                onClick={addEducation}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add
              </button>
            </div>
            {(data.educations || []).map((edu, idx) => (
              <div key={idx} className="mb-4 p-3 bg-white rounded border">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => removeEducation(idx)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Degree"
                  value={edu.degree || ''}
                  onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                  className="w-full px-3 py-2 border rounded mb-2"
                />
                <input
                  type="text"
                  placeholder="Field of Study"
                  value={edu.field || ''}
                  onChange={(e) => updateEducation(idx, 'field', e.target.value)}
                  className="w-full px-3 py-2 border rounded mb-2"
                />
                <input
                  type="text"
                  placeholder="Institution"
                  value={edu.institution || ''}
                  onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                  className="w-full px-3 py-2 border rounded mb-2"
                />
                <input
                  type="text"
                  placeholder="Graduation Date"
                  value={edu.graduation_date || ''}
                  onChange={(e) => updateEducation(idx, 'graduation_date', e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            ))}
          </div>

          {/* Skills */}
          <div className="cv-section mb-6">
            <h3 className="font-medium text-gray-700 mb-3">Skills</h3>
            <textarea
              placeholder="Enter skills separated by commas (e.g., JavaScript, React, Node.js)"
              value={data.skills?.join(', ') || ''}
              onChange={(e) => updateSkills(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Languages */}
          <div className="cv-section mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">Languages</h3>
              <button
                onClick={addLanguage}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add
              </button>
            </div>
            {(data.languages || []).map((lang, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Language"
                  value={lang.language || ''}
                  onChange={(e) => updateLanguage(idx, 'language', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <input
                  type="text"
                  placeholder="Level"
                  value={lang.level || ''}
                  onChange={(e) => updateLanguage(idx, 'level', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <button
                  onClick={() => removeLanguage(idx)}
                  className="text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Export bar */}
          <CVExportBar data={data} />
        </div>
      </div>

      {/* Right panel - preview */}
      <div className="w-1/2 overflow-y-auto bg-gray-100 p-4">
        <CVLivePreview data={data} template={template} />
      </div>
    </div>
  );
}