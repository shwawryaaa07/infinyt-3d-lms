import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Certificate } from '../../src/types/electron.d.ts';

export async function generateCertificatePdf(
  cert: Certificate,
  outputPath: string
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    const pdfDoc = await PDFDocument.create();
    // Landscape A4: 842 x 595 points
    const page = pdfDoc.addPage([842, 595]);
    const { width, height } = page.getSize();

    // Embed fonts
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontCourier = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // Color tokens
    const bgDark = rgb(0.043, 0.059, 0.098); // #0b0f19
    const cardDark = rgb(0.067, 0.094, 0.153); // #111827
    const goldAccent = rgb(0.96, 0.62, 0.04); // #f59e0b
    const cyanAccent = rgb(0.024, 0.71, 0.83); // #06b6d4
    const borderSlate = rgb(0.14, 0.196, 0.278); // #243247
    const textLight = rgb(0.97, 0.98, 0.99); // #f8fafc
    const textMuted = rgb(0.58, 0.64, 0.72); // #94a3b8

    // 1. Background Fill
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: bgDark
    });

    // 2. Inner Certificate Card Framing
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      color: cardDark,
      borderColor: borderSlate,
      borderWidth: 2
    });

    // 3. Double Golden Accent Border
    page.drawRectangle({
      x: 42,
      y: 42,
      width: width - 84,
      height: height - 84,
      borderColor: goldAccent,
      borderWidth: 1.5
    });

    // Decorative corner brackets
    const corners = [
      { x: 50, y: height - 50 },
      { x: width - 50, y: height - 50 },
      { x: 50, y: 50 },
      { x: width - 50, y: 50 }
    ];

    corners.forEach((c) => {
      page.drawCircle({
        x: c.x,
        y: c.y,
        size: 3,
        color: goldAccent
      });
    });

    // 4. Header Branding: "INFINYT 3D"
    const brandText = 'INFINYT 3D  |  TECHNICAL TRAINING PLATFORM';
    const brandWidth = fontBold.widthOfTextAtSize(brandText, 12);
    page.drawText(brandText, {
      x: (width - brandWidth) / 2,
      y: height - 80,
      size: 12,
      font: fontBold,
      color: cyanAccent
    });

    // Sub-brand
    const orgText = 'INDUSTRIAL ADDITIVE MANUFACTURING & ENGINEERING STANDARDS';
    const orgWidth = fontRegular.widthOfTextAtSize(orgText, 8.5);
    page.drawText(orgText, {
      x: (width - orgWidth) / 2,
      y: height - 98,
      size: 8.5,
      font: fontRegular,
      color: textMuted
    });

    // 5. Main Certificate Title
    const titleText = 'CERTIFICATE OF TECHNICAL COMPETENCY';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, 24);
    page.drawText(titleText, {
      x: (width - titleWidth) / 2,
      y: height - 150,
      size: 24,
      font: fontBold,
      color: goldAccent
    });

    // Decorative line under title
    page.drawLine({
      start: { x: (width - titleWidth) / 2 - 20, y: height - 162 },
      end: { x: (width + titleWidth) / 2 + 20, y: height - 162 },
      thickness: 1.5,
      color: borderSlate
    });

    // 6. Recipient text
    const certifyText = 'This is to officially certify that';
    const certifyWidth = fontOblique.widthOfTextAtSize(certifyText, 12);
    page.drawText(certifyText, {
      x: (width - certifyWidth) / 2,
      y: height - 200,
      size: 12,
      font: fontOblique,
      color: textMuted
    });

    // Recipient Name
    const recipientName = 'Infinyt 3D Technical Learner';
    const nameWidth = fontBold.widthOfTextAtSize(recipientName, 26);
    page.drawText(recipientName, {
      x: (width - nameWidth) / 2,
      y: height - 245,
      size: 26,
      font: fontBold,
      color: textLight
    });

    // Line under student name
    page.drawLine({
      start: { x: width / 2 - 180, y: height - 257 },
      end: { x: width / 2 + 180, y: height - 257 },
      thickness: 1,
      color: cyanAccent
    });

    // Completion rationale
    const rationaleText = 'has successfully completed all laboratory modules, machine calibrations, and scored passing grade on the';
    const rationaleWidth = fontRegular.widthOfTextAtSize(rationaleText, 11);
    page.drawText(rationaleText, {
      x: (width - rationaleWidth) / 2,
      y: height - 290,
      size: 11,
      font: fontRegular,
      color: textMuted
    });

    // Course Title
    const courseTitle = cert.course_title || 'Industrial Additive Manufacturing & FDM Calibration';
    const courseWidth = fontBold.widthOfTextAtSize(courseTitle, 18);
    page.drawText(courseTitle, {
      x: (width - courseWidth) / 2,
      y: height - 325,
      size: 18,
      font: fontBold,
      color: textLight
    });

    // 7. Security Seal & Verification Hash Block
    const hashBoxX = 70;
    const hashBoxY = 80;
    const hashBoxW = 280;
    const hashBoxH = 65;

    page.drawRectangle({
      x: hashBoxX,
      y: hashBoxY,
      width: hashBoxW,
      height: hashBoxH,
      color: bgDark,
      borderColor: borderSlate,
      borderWidth: 1
    });

    page.drawText('OFFLINE CRYPTOGRAPHIC VERIFICATION', {
      x: hashBoxX + 12,
      y: hashBoxY + 45,
      size: 8,
      font: fontBold,
      color: cyanAccent
    });

    page.drawText(`VERIFICATION HASH: ${cert.verification_hash || 'I3D-VERIFIED-AIRGAP'}`, {
      x: hashBoxX + 12,
      y: hashBoxY + 27,
      size: 10,
      font: fontCourier,
      color: goldAccent
    });

    const issueDateStr = cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US');
    page.drawText(`ISSUE DATE: ${issueDateStr}  |  AIR-GAPPED DB RECORD`, {
      x: hashBoxX + 12,
      y: hashBoxY + 12,
      size: 7.5,
      font: fontRegular,
      color: textMuted
    });

    // 8. Signatures Block
    const sigX1 = width - 330;
    const sigX2 = width - 150;
    const sigY = 90;

    // Signature 1
    page.drawLine({
      start: { x: sigX1 - 20, y: sigY + 30 },
      end: { x: sigX1 + 100, y: sigY + 30 },
      thickness: 1,
      color: borderSlate
    });
    page.drawText('Chief Technical Examiner', {
      x: sigX1 - 10,
      y: sigY + 15,
      size: 9,
      font: fontBold,
      color: textLight
    });
    page.drawText('Infinyt 3D Additive Lab', {
      x: sigX1 - 10,
      y: sigY + 3,
      size: 7.5,
      font: fontRegular,
      color: textMuted
    });

    // Signature 2
    page.drawLine({
      start: { x: sigX2 - 10, y: sigY + 30 },
      end: { x: sigX2 + 100, y: sigY + 30 },
      thickness: 1,
      color: borderSlate
    });
    page.drawText('Director of Certification', {
      x: sigX2 - 5,
      y: sigY + 15,
      size: 9,
      font: fontBold,
      color: textLight
    });
    page.drawText('Industrial Standards Board', {
      x: sigX2 - 5,
      y: sigY + 3,
      size: 7.5,
      font: fontRegular,
      color: textMuted
    });

    // Save to target destination
    const pdfBytes = await pdfDoc.save();
    const targetDir = path.dirname(outputPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, pdfBytes);

    return {
      success: true,
      filePath: outputPath
    };
  } catch (err: any) {
    console.error('Error generating PDF certificate:', err);
    return { success: false, error: err.message || 'PDF generation error' };
  }
}
