'use client';

import React, { ReactNode } from 'react';

interface CVEditorLayoutProps {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
}

export function CVEditorLayout({ leftPanel, rightPanel }: CVEditorLayoutProps) {
  return (
    <div className="cv-editor-layout flex h-screen">
      {/* Left panel - form */}
      <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-6 bg-gray-50">
        {leftPanel}
      </div>

      {/* Right panel - preview */}
      <div className="w-1/2 overflow-y-auto bg-gray-100 p-4">
        {rightPanel}
      </div>
    </div>
  );
}