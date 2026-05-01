'use client';

import React, { useState } from 'react';
import { FileDown, FileText, Upload, Loader2 } from 'lucide-react';
import { CVData } from '../templates/FrenchStandard';
import { cvToDocx, coverLetterToDocx, saveDocx } from '@/lib/docx/export';

interface CVExportBarProps {
  data: CVData;
}

export function CVExportBar({ data }: CVExportBarProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<string | null>(null);

  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportFormat('pdf');

    try {
      // Generate HTML from template
      const html = generateCVHtml(data);
      
      const response = await fetch('/api/cv/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.personal_info?.full_name || 'cv'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    setExportFormat('docx');

    try {
      const buffer = await cvToDocx(data);
      const filename = `${data.personal_info?.full_name || 'cv'}.docx`;
      saveDocx(buffer, filename);
    } catch (error) {
      console.error('DOCX export error:', error);
      alert('Failed to export DOCX. Please try again.');
    } finally {
      setIsExporting(false);
      setExportFormat(null);
    }
  };

  const handleImport = () => {
    // Trigger file input click
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Upload to /api/profile/resume/import
        const formData = new FormData();
        formData.append('file', file);

        try {
          setIsExporting(true);
          setExportFormat('importing');

          const response = await fetch('/api/profile/resume/import', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Failed to import resume');
          }

          const result = await response.json();
          if (result.success && result.profile) {
            // Emit event to update the form
            window.dispatchEvent(new CustomEvent('resume-imported', { detail: result.profile }));
          }
        } catch (error) {
          console.error('Import error:', error);
          alert('Failed to import resume. Please try again.');
        } finally {
          setIsExporting(false);
          setExportFormat(null);
        }
      }
    };
    input.click();
  };

  return (
    <div className="cv-export-bar flex gap-3 p-4 bg-white border-t border-gray-200">
      <button
        onClick={handleExportPDF}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isExporting && exportFormat === 'pdf' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <FileDown size={16} />
        )}
        Exporter PDF
      </button>

      <button
        onClick={handleExportDocx}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {isExporting && exportFormat === 'docx' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <FileText size={16} />
        )}
        Exporter DOCX
      </button>

      <button
        onClick={handleImport}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
      >
        {isExporting && exportFormat === 'importing' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Upload size={16} />
        )}
        Importer CV
      </button>
    </div>
  );
}

// Simple HTML generation for PDF export
function generateCVHtml(data: CVData): string {
  const personalInfo = data.personal_info || {};
  const skills = data.skills || [];
  const experiences = data.experiences || [];
  const educations = data.educations || [];
  const languages = data.languages || [];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { font-size: 24px; margin-bottom: 10px; }
    h2 { font-size: 16px; margin: 20px 0 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
    .contact { color: #666; font-size: 12px; }
    .links a { color: #0066cc; margin-right: 10px; }
    .skill { display: inline-block; background: #f0f0f0; padding: 2px 8px; margin: 2px; border-radius: 3px; font-size: 11px; }
    .exp-date { color: #666; font-size: 11px; }
  </style>
</head>
<body>
  <h1>${personalInfo.full_name || ''}</h1>
  <div class="contact">
    ${personalInfo.email || ''} | ${personalInfo.phone || ''} | ${personalInfo.location || ''}
  </div>
  <div class="links">
    ${personalInfo.linkedin_url ? `<a href="${personalInfo.linkedin_url}">LinkedIn</a>` : ''}
    ${personalInfo.portfolio_url ? `<a href="${personalInfo.portfolio_url}">Portfolio</a>` : ''}
  </div>

  ${data.summary ? `<h2>Profile</h2><p>${data.summary}</p>` : ''}

  ${skills.length > 0 ? `<h2>Skills</h2><div>${skills.map(s => `<span class="skill">${s}</span>`).join('')}</div>` : ''}

  ${languages.length > 0 ? `<h2>Languages</h2><p>${languages.map(l => `${l.language} (${l.level})`).join(', ')}</p>` : ''}

  ${experiences.length > 0 ? `<h2>Experience</h2>${experiences.map(exp => `
    <div style="margin-bottom: 15px;">
      <strong>${exp.title || ''}</strong>
      <span class="exp-date"> | ${exp.start_date || ''} - ${exp.end_date || 'Present'}</span>
      <div>${exp.company || ''}</div>
      ${exp.description ? `<p>${exp.description}</p>` : ''}
    </div>
  `).join('')}` : ''}

  ${educations.length > 0 ? `<h2>Education</h2>${educations.map(edu => `
    <div style="margin-bottom: 10px;">
      <strong>${edu.degree || ''}</strong>${edu.field ? ` in ${edu.field}` : ''}
      <div>${edu.institution || ''}${edu.graduation_date ? ` | ${edu.graduation_date}` : ''}</div>
    </div>
  `).join('')}` : ''}
</body>
</html>
  `;
}