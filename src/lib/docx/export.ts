import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export interface PersonalInfo {
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  portfolio_url?: string;
}

export interface Experience {
  company?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface Education {
  institution?: string;
  degree?: string;
  field?: string;
  graduation_date?: string;
}

export interface Profile {
  personal_info?: PersonalInfo;
  summary?: string;
  experiences?: Experience[];
  educations?: Education[];
  skills?: string[];
  languages?: Array<{ language?: string; level?: string }>;
}

/**
 * Convert a profile to a DOCX document
 */
export async function cvToDocx(profile: Profile): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Header - Name
  if (profile.personal_info?.full_name) {
    children.push(
      new Paragraph({
        text: profile.personal_info.full_name,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      })
    );
  }

  // Contact info
  const contactParts: string[] = [];
  if (profile.personal_info?.email) contactParts.push(profile.personal_info.email);
  if (profile.personal_info?.phone) contactParts.push(profile.personal_info.phone);
  if (profile.personal_info?.location) contactParts.push(profile.personal_info.location);

  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        text: contactParts.join(' | '),
        alignment: AlignmentType.CENTER,
      })
    );
  }

  // Links
  if (profile.personal_info?.linkedin_url || profile.personal_info?.portfolio_url) {
    const links: string[] = [];
    if (profile.personal_info.linkedin_url) links.push(profile.personal_info.linkedin_url);
    if (profile.personal_info.portfolio_url) links.push(profile.personal_info.portfolio_url);

    children.push(
      new Paragraph({
        text: links.join(' | '),
        alignment: AlignmentType.CENTER,
      })
    );
  }

  // Summary
  if (profile.summary) {
    children.push(new Paragraph({ text: '' })); // Empty line
    children.push(
      new Paragraph({
        text: 'Summary',
        heading: HeadingLevel.HEADING_1,
      })
    );
    children.push(new Paragraph({ text: profile.summary }));
  }

  // Experience
  if (profile.experiences && profile.experiences.length > 0) {
    children.push(new Paragraph({ text: '' }));
    children.push(
      new Paragraph({
        text: 'Experience',
        heading: HeadingLevel.HEADING_1,
      })
    );

    for (const exp of profile.experiences) {
      const dateRange = [exp.start_date, exp.end_date == 'present' ? 'Present' : exp.end_date]
        .filter(Boolean)
        .join(' - ');

      children.push(
        new Paragraph({
          text: exp.title,
          heading: HeadingLevel.HEADING_2,
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: exp.company || '', bold: true }),
            new TextRun({ text: dateRange ? ` | ${dateRange}` : '' }),
          ],
        })
      );
      if (exp.description) {
        children.push(new Paragraph({ text: exp.description }));
      }
    }
  }

  // Education
  if (profile.educations && profile.educations.length > 0) {
    children.push(new Paragraph({ text: '' }));
    children.push(
      new Paragraph({
        text: 'Education',
        heading: HeadingLevel.HEADING_1,
      })
    );

    for (const edu of profile.educations) {
      const datePart = edu.graduation_date || '';
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: edu.degree || '', bold: true }),
            new TextRun({ text: edu.field ? ` in ${edu.field}` : '' }),
            new TextRun({ text: datePart ? ` | ${datePart}` : '' }),
          ],
        })
      );
      if (edu.institution) {
        children.push(new Paragraph({ text: edu.institution }));
      }
    }
  }

  // Skills
  if (profile.skills && profile.skills.length > 0) {
    children.push(new Paragraph({ text: '' }));
    children.push(
      new Paragraph({
        text: 'Skills',
        heading: HeadingLevel.HEADING_1,
      })
    );
    children.push(new Paragraph({ text: profile.skills.join(', ') }));
  }

  // Languages
  if (profile.languages && profile.languages.length > 0) {
    children.push(new Paragraph({ text: '' }));
    children.push(
      new Paragraph({
        text: 'Languages',
        heading: HeadingLevel.HEADING_1,
      })
    );

    const langText = profile.languages
      .map((l) => `${l.language} (${l.level})`)
      .join(', ');
    children.push(new Paragraph({ text: langText }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * Convert a cover letter text to a DOCX document
 */
export async function coverLetterToDocx(text: string): Promise<Buffer> {
  const paragraphs = text.split('\n\n').map(
    (para) =>
      new Paragraph({
        text: para.trim(),
        spacing: {
          after: 200,
        },
      })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * Save a buffer as a DOCX file (client-side)
 */
export function saveDocx(buffer: Buffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  saveAs(blob, filename);
}