import React, { useEffect, useState } from 'react';
import { Award, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { Certificate } from '../types/electron.d.ts';
import { api } from '../services/api';

interface CertificatesViewProps {
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CertificatesView: React.FC<CertificatesViewProps> = ({ onNotify }) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadCertificates = async () => {
    try {
      const data = await api.getCertificates();
      setCertificates(data);
      if (data.length > 0) {
        setSelectedCert(data[0]);
      }
    } catch (err) {
      console.error('Error loading certificates:', err);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const handleDownloadPdf = async () => {
    if (!selectedCert) return;
    setIsGenerating(true);
    try {
      const result = await api.generateCertificatePdf(selectedCert.id);
      if (result && result.success) {
        onNotify('Certificate PDF generated successfully!', 'success');
      } else {
        onNotify('PDF generation cancelled or failed', 'error');
      }
    } catch (err: any) {
      onNotify(err.message || 'Error generating vector PDF certificate', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto h-full bg-slate-50">
      {/* Header */}
      <div className="flex items-end justify-between border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-orange-600 inline mr-1" />
              <span>OFFICIAL CREDENTIALS</span>
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-poppins">
            My Certificates
          </h1>
          <div className="accent-bar mt-1.5" />
        </div>

        {selectedCert && (
          <button
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="px-6 py-2.5 rounded-full btn-brand-gradient text-xs font-bold tracking-wider flex items-center space-x-2 shadow-lg shadow-orange-500/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? 'GENERATING PDF...' : 'DOWNLOAD PDF CERTIFICATE'}</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      {certificates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-4 shadow-sm max-w-lg mx-auto my-12">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto border border-orange-200">
            <Award className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 font-poppins">No Certificates Earned Yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Complete 100% of any training course and pass all assessments to unlock your verified engineering credential.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-8">
          {/* Certificate List (Left 1 col) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold font-mono uppercase text-slate-400">
              Earned Credentials ({certificates.length})
            </h4>
            <div className="space-y-2">
              {certificates.map((cert) => {
                const isSelected = selectedCert?.id === cert.id;
                return (
                  <div
                    key={cert.id}
                    onClick={() => setSelectedCert(cert)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-orange-50 border-orange-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate font-poppins">
                          {cert.course_title || 'Engineering Certificate'}
                        </h4>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Issued: {new Date(cert.issue_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Certificate Preview Card (Right 2 cols) */}
          <div className="col-span-2">
            {selectedCert && (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
                <div className="aspect-[1.414/1] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-2xl p-8 flex flex-col justify-between relative overflow-hidden border border-slate-700 shadow-2xl">
                  {/* Decorative Watermark Overlay */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,88,12,0.15),transparent_60%)] pointer-events-none" />

                  {/* Top Branding */}
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <div className="text-xs font-bold tracking-widest text-orange-500 uppercase font-mono">
                        INFINYT 3D ACADEMY
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        INDUSTRIAL TECHNICAL CERTIFICATION
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Center Content */}
                  <div className="text-center space-y-3 relative z-10 py-6">
                    <span className="text-[11px] font-mono tracking-widest text-slate-400 uppercase">
                      THIS CERTIFIES THAT THE LEARNER HAS DEMONSTRATED COMPETENCY IN
                    </span>
                    <h2 className="text-2xl font-black text-white tracking-tight font-poppins">
                      {selectedCert.course_title}
                    </h2>
                    <div className="flex items-center justify-center space-x-2 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verified & Authenticated by Infinyt 3D Platform</span>
                    </div>
                  </div>

                  {/* Bottom Verification & Metadata */}
                  <div className="flex justify-between items-end pt-4 border-t border-slate-800 relative z-10 text-[10px] font-mono text-slate-400">
                    <div>
                      <div className="text-slate-500">ISSUE DATE</div>
                      <div className="text-slate-300 font-bold">{new Date(selectedCert.issue_date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-500">VERIFICATION HASH</div>
                      <div className="text-orange-400 font-bold">{selectedCert.verification_hash}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
