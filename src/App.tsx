import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  FileDown,
  GraduationCap,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Printer,
  RefreshCw,
  Scale,
  Sparkles,
  User,
  AlertCircle,
  AlertTriangle,
  FolderKanban,
  Trash2,
  Save,
} from 'lucide-react';

export default function App() {
  const [studentName, setStudentName] = useState('');
  const [filiere, setFiliere] = useState('1ère BAC - Sciences Expérimentales');
  const [sujet, setSujet] = useState('');
  const [texte, setTexte] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [activePlan, setActivePlan] = useState<'A' | 'B'>('A');
  const [hasReport, setHasReport] = useState(false);
  const [isHorsSujet, setIsHorsSujet] = useState(false);
  const [offTopicType, setOffTopicType] = useState<'THEMATIQUE' | 'METHODOLOGIQUE' | 'GENERAL'>('GENERAL');
  const [detectedPlanType, setDetectedPlanType] = useState<'OPINION' | 'ANALYTIQUE' | ''>('OPINION');

  // Authentification Enseignant
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [sessionPassword, setSessionPassword] = useState(() => localStorage.getItem('akhawayn_pwd') || 'AKHAWAYN2026');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Modal Changement de mot de passe
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [changeFeedback, setChangeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isChanging, setIsChanging] = useState(false);

  // Boîtes d'archives par œuvre
  const [archives, setArchives] = useState<{ boite: any[]; antigone: any[]; condamne: any[] }>({
    boite: [],
    antigone: [],
    condamne: [],
  });
  const [selectedWorkBox, setSelectedWorkBox] = useState<'boite' | 'antigone' | 'condamne' | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const planARef = useRef('');
  const planBRef = useRef('');

  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async () => {
    try {
      const res = await fetch('/api/archives');
      if (res.ok) {
        const data = await res.json();
        setArchives(data);
      }
    } catch (e) {
      console.error('Erreur lecture archives:', e);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPasswordInput.trim() || !newPasswordInput.trim()) {
      setChangeFeedback({ type: 'error', message: 'Veuillez remplir tous les champs.' });
      return;
    }
    setIsChanging(true);
    setChangeFeedback(null);
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: oldPasswordInput.trim(),
          newPassword: newPasswordInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChangeFeedback({ type: 'success', message: 'Mot de passe mis à jour avec succès !' });
        setSessionPassword(newPasswordInput.trim());
        setOldPasswordInput('');
        setNewPasswordInput('');
        setTimeout(() => {
          setShowChangeModal(false);
          setChangeFeedback(null);
        }, 1500);
      } else {
        setChangeFeedback({ type: 'error', message: data.message || 'Échec de la modification.' });
      }
    } catch (err) {
      setChangeFeedback({ type: 'error', message: 'Erreur réseau.' });
    } finally {
      setIsChanging(false);
    }
  };

  const displayM = (type: 'A' | 'B') => {
    setActivePlan(type);
    const ts = document.getElementById('ts');
    const td = document.getElementById('td');
    if (ts) ts.classList.toggle('active', type === 'A');
    if (td) td.classList.toggle('active', type === 'B');

    const outModel = document.getElementById('outModel');
    if (outModel) {
      const content = type === 'A' ? planARef.current : planBRef.current;
      outModel.innerHTML = marked.parse(content) as string;
    }
  };

  const handlePrintPdf = () => {
    const origTitle = document.title;
    const cleanName = (studentName.trim() || 'CANDIDAT').replace(/\s+/g, '_');
    document.title = `Rapport_Expertise_Bac_${cleanName}`;
    window.print();
    setTimeout(() => {
      document.title = origTitle;
    }, 1500);
  };

  const handleExportPdf = async () => {
    const reportElement = document.getElementById('reportSection');
    if (!reportElement) {
      alert("Veuillez d'abord générer l'expertise didactique.");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const origTitle = document.title;
      const cleanName = (studentName.trim() || 'CANDIDAT').replace(/\s+/g, '_');
      document.title = `Rapport_Expertise_Bac_${cleanName}`;

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        ignoreElements: (el) => el.classList.contains('no-print'),
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.96);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      pdf.save(`Rapport_Expertise_Bac_${cleanName}.pdf`);
      document.title = origTitle;
    } catch (err) {
      console.error("Erreur génération PDF, impression système:", err);
      handlePrintPdf();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const cleanModelText = (txt: string) => {
    return txt
      .replace(/<strong>Introduction[^<]*<\/strong>\s*(<br>)?/gi, '')
      .replace(/<strong>I\.[^<]*<\/strong>\s*(<br>)?/gi, '')
      .replace(/<strong>II\.[^<]*<\/strong>\s*(<br>)?/gi, '')
      .replace(/<strong>III\.[^<]*<\/strong>\s*(<br>)?/gi, '')
      .replace(/<strong>Conclusion[^<]*<\/strong>\s*(<br>)?/gi, '')
      .replace(/###\s*(Introduction|I\.|II\.|III\.|Conclusion)[^\n]*\n/gi, '')
      .replace(/<span[^>]*>Introduction[^<]*<\/span>/gi, '')
      .replace(/<span[^>]*>Développement[^<]*<\/span>/gi, '')
      .replace(/<span[^>]*>Conclusion[^<]*<\/span>/gi, '');
  };

  const formatTranscription = (transText: string, originalText: string): string => {
    const cleaned = transText ? transText.replace(/<span class="struct-missing">[^<]*<\/span>/gi, '').trim() : '';
    if (!cleaned) {
      const paras = originalText.split(/\n\s*\n/).filter((p) => p.trim());
      return paras.map((p) => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`).join('\n\n');
    }

    const pCount = (cleaned.match(/<p[\s>]/gi) || []).length;
    if (pCount > 1) return cleaned;

    const rawParas = cleaned.split(/\n\s*\n/).filter((p) => p.trim());
    if (rawParas.length > 1) {
      return rawParas
        .map((p) => {
          let trimmed = p.trim().replace(/^<p>/i, '').replace(/<\/p>$/i, '').trim();
          return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
        })
        .join('\n\n');
    }
    return `<p>${cleaned.replace(/\n/g, '<br/>')}</p>`;
  };

  const checkOffTopicStatus = (sujetStr: string, texteStr: string): { isOff: boolean; type: 'METHODOLOGIQUE' | 'THEMATIQUE' | 'GENERAL' } => {
    if (!sujetStr || !texteStr) return { isOff: false, type: 'GENERAL' };
    const norm = (s: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const sNorm = norm(sujetStr);
    const tNorm = norm(texteStr);

    // Détection hors-sujet méthodologique (Sujet d'opinion traité en plan analytique)
    const opinionIndicators = [
      'pensez vous', 'partagez vous', 'etes vous', 'd accord', 'qu en pensez vous',
      'faut il', 'peut on', 'votre avis', 'votre point de vue', 'votre opinion',
      'approuvez vous', 'selon vous', 'justifiez votre point de vue', 'partagez cette'
    ];
    const isExplicitAnalyticSubject =
      sNorm.includes('causes et solutions') ||
      sNorm.includes('causes et consequences') ||
      sNorm.includes('quelles sont les causes');

    const isOpinion = opinionIndicators.some((ind) => sNorm.includes(ind)) && !isExplicitAnalyticSubject;

    if (isOpinion) {
      const causeWords = ['cause', 'causes', 'facteur', 'facteurs', 'raison', 'raisons'];
      const solutionWords = ['solution', 'solutions', 'remede', 'remedes', 'remedier', 'resoudre', 'lutter'];
      const tWords = tNorm.split(' ');
      const causeCount = tWords.filter((w) => causeWords.includes(w)).length;
      const solutionCount = tWords.filter((w) => solutionWords.includes(w)).length;
      const analyticalPhrases = [
        'parmi les causes', 'les causes de ce', 'premiere cause', 'deuxieme cause',
        'les facteurs de', 'les solutions pour', 'pour remedier', 'pour resoudre',
        'comme solution', 'comme solutions'
      ];
      const hasAnalyticalPhrase = analyticalPhrases.some((p) => tNorm.includes(p));
      const hasBoth = (causeCount >= 1 && solutionCount >= 1) || (causeCount >= 2 && solutionCount >= 1);

      if (hasAnalyticalPhrase || hasBoth) {
        return { isOff: true, type: 'METHODOLOGIQUE' };
      }
    }
    return { isOff: false, type: 'GENERAL' };
  };

  const handleSaveToWorkBox = async (workKey: 'boite' | 'antigone' | 'condamne') => {
    const candidateName = studentName.trim() || 'CANDIDAT';
    const scoreText = document.getElementById('scoreBadge')?.innerText || 'N/A';
    const reformulationsText = document.getElementById('outRef')?.innerHTML || '';
    const modelText = document.getElementById('outModel')?.innerHTML || '';

    try {
      const res = await fetch('/api/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work: workKey,
          candidateName,
          filiere,
          sujet,
          texte,
          score: scoreText,
          reformulations: reformulationsText,
          modelText,
        }),
      });
      if (res.ok) {
        await fetchArchives();
        const workNames = {
          boite: 'La Boîte à Merveilles',
          antigone: 'Antigone',
          condamne: "Le Dernier Jour d'un Condamné",
        };
        setSaveToast(`Dossier archivé avec succès dans : ${workNames[workKey]}`);
        setTimeout(() => setSaveToast(null), 4000);
      }
    } catch (e) {
      console.error("Erreur enregistrement archive:", e);
    }
  };

  const runEvaluation = async () => {
    if (!sujet.trim() || !texte.trim()) {
      alert('Veuillez renseigner le sujet officiel et la copie du candidat.');
      return;
    }

    setIsProcessing(true);
    setHasReport(false);
    setIsHorsSujet(false);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-password': sessionPassword,
        },
        body: JSON.stringify({
          prompt: '',
          nom: studentName.trim() || 'CANDIDAT',
          filiere: filiere.trim() || '1ère Année Baccalauréat',
          sujet: sujet.trim(),
          texte: texte.trim(),
          password: sessionPassword,
        }),
      });

      const data = await res.json();
      const rawText = data.result || '';

      const offTopicCheck = checkOffTopicStatus(sujet, texte);
      const isOffTopic =
        rawText.toUpperCase().includes('[[HORS_SUJET]]') ||
        rawText.toUpperCase().includes('HORS-SUJET') ||
        offTopicCheck.isOff;

      setIsHorsSujet(isOffTopic);
      setOffTopicType(offTopicCheck.type);

      const parts: Record<string, string> = {};
      const tags = ['GRILLE', 'TRANSCRIPTION', 'BILAN', 'TABLEAU', 'REFORMULATION', 'TYPE', 'PLAN_A', 'PLAN_B'];

      tags.forEach((tag) => {
        const regex = new RegExp(`\\[\\[${tag}\\]\\]([\\s\\S]*?)(?=\\[\\[|$)`, 'i');
        const match = rawText.match(regex);
        if (match) parts[tag] = match[1].trim();
      });

      const detectedType = parts['TYPE'] ? parts['TYPE'].trim().toUpperCase() : 'OPINION';
      const isAnalytic = detectedType.includes('ANALYTIQUE');
      setDetectedPlanType(isAnalytic ? 'ANALYTIQUE' : 'OPINION');

      // Notes
      let totalScore = 0;
      if (isOffTopic) {
        totalScore = 0;
        const gNote = document.getElementById('gNote');
        const scoreBadge = document.getElementById('scoreBadge');
        if (gNote) gNote.innerText = '0.00 / 10';
        if (scoreBadge) {
          scoreBadge.innerText = '0.0 / 10 (Sanction Éliminatoire)';
          scoreBadge.className = 'font-mono text-2xl font-black px-4 py-1.5 rounded-xl border border-red-300 text-red-700 bg-red-50';
        }
      } else if (parts['GRILLE']) {
        const criteria = parts['GRILLE'].split('|');
        criteria.forEach((c) => {
          const [k, v] = c.split(':');
          const val = parseFloat(v);
          if (!isNaN(val)) totalScore += val;
          const el = document.getElementById(`g_${k?.trim().toLowerCase()}`);
          if (el) el.innerText = !isNaN(val) ? val.toFixed(2) : '-';
        });

        const gNote = document.getElementById('gNote');
        const scoreBadge = document.getElementById('scoreBadge');
        if (gNote) gNote.innerText = `${totalScore.toFixed(2)} / 10`;
        if (scoreBadge) {
          scoreBadge.innerText = `${totalScore.toFixed(2)} / 10`;
          scoreBadge.className =
            totalScore >= 7
              ? 'font-mono text-2xl sm:text-3xl font-black px-4 py-1.5 rounded-xl border border-emerald-300 text-emerald-800 bg-emerald-50'
              : totalScore >= 5
              ? 'font-mono text-2xl sm:text-3xl font-black px-4 py-1.5 rounded-xl border border-amber-300 text-amber-800 bg-amber-50'
              : 'font-mono text-2xl sm:text-3xl font-black px-4 py-1.5 rounded-xl border border-rose-300 text-rose-800 bg-rose-50';
        }
      }

      // Remplissage DOM
      const outTrans = document.getElementById('outTrans');
      if (outTrans) {
        outTrans.innerHTML = formatTranscription(parts['TRANSCRIPTION'] || '', texte);
      }

      const outBilan = document.getElementById('outBilan');
      if (outBilan && parts['BILAN']) {
        outBilan.innerHTML = marked.parse(parts['BILAN']) as string;
      }

      const outTableau = document.getElementById('outTableau');
      if (outTableau && parts['TABLEAU']) {
        outTableau.innerHTML = marked.parse(parts['TABLEAU']) as string;
      }

      const outRef = document.getElementById('outRef');
      if (outRef && parts['REFORMULATION']) {
        outRef.innerHTML = marked.parse(parts['REFORMULATION']) as string;
      }

      planARef.current = cleanModelText(parts['PLAN_A'] || '');
      planBRef.current = cleanModelText(parts['PLAN_B'] || '');

      displayM('A');
      setHasReport(true);

      setTimeout(() => {
        document.getElementById('reportSection')?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } catch (error) {
      console.error("Erreur:", error);
      alert('Une erreur réseau est survenue.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 pb-16 font-outfit">
      {saveToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 text-emerald-100 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header Institutionnel */}
      <header className="bg-navy-primary text-white border-b-2 border-gold/40 shadow-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-600 flex items-center justify-center text-white shadow-lg">
              <GraduationCap className="w-8 h-8 text-amber-300" />
            </div>
            <div>
              <div className="font-cinzel tracking-widest text-amber-400 text-xs uppercase font-semibold">
                Royaume du Maroc — Ministère de l'Éducation Nationale
              </div>
              <h1 className="font-cinzel text-xl sm:text-2xl font-black text-white">
                CENTRE AL AKHAWAYN
              </h1>
              <p className="text-slate-300 text-xs">
                Direction de l'Expertise Didactique • Baccalauréat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedWorkBox('boite')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-navy-deep text-amber-300 border border-amber-500/30"
            >
              <FolderKanban className="w-4 h-4 text-amber-400" />
              <span>Boîtes d'Archives</span>
            </button>
            <button
              onClick={() => setShowChangeModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/40"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Accès Enseignant</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container avec les 2 colonnes calibrées */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <span className="inline-block px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase rounded-full mb-2">
              Protocole d'Évaluation Didactique
            </span>
            <h2 className="font-cinzel text-xl sm:text-2xl font-black text-slate-900">
              Audit Chirurgical des Écrits Académiques
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Évaluation continue, diagnostic de structure en entonnoir, détection automatique des plans (Analytique / Opinion) et modèles réécrits conformes au barème régional officiel (10 Points).
            </p>
          </div>

          {/* Deux colonnes : Nom & Filière */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Nom & Prénom de l'Élève
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Ex: Youssef El Mansouri"
                className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Filière / Niveau
              </label>
              <select
                value={filiere}
                onChange={(e) => setFiliere(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
              >
                <option>1ère BAC - Sciences Expérimentales</option>
                <option>1ère BAC - Sciences Mathématiques</option>
                <option>1ère BAC - Lettres & Sc. Humaines</option>
                <option>Prépa Concours (CRMEF / ENS)</option>
              </select>
            </div>
          </div>

          {/* Sujet */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Sujet de Production Écrite (Consigne Officielle)
              </label>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Barème officiel /10
              </span>
            </div>
            <textarea
              rows={3}
              value={sujet}
              onChange={(e) => setSujet(e.target.value)}
              placeholder="Collez ici la consigne officielle ou l'intitulé de l'examen régional..."
              className="w-full p-4 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800"
            />
          </div>

          {/* Copie */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Copie Rédigée par le Candidat
              </label>
              <span className="text-xs text-slate-500 italic">
                Maintien scrupuleux des alinéas et paragraphes
              </span>
            </div>
            <textarea
              rows={8}
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Saisissez ou collez ici la production écrite intégrale de l'élève..."
              className="writing-ruled-zone w-full p-4 rounded-xl border border-slate-300 bg-white text-base font-newsreader leading-relaxed"
            />
          </div>

          <button
            onClick={runEvaluation}
            disabled={isProcessing}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white font-cinzel text-lg font-bold tracking-wider shadow-lg flex items-center justify-center gap-3 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Expertise Didactique en Cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Générer l'Expertise Certifiée</span>
              </>
            )}
          </button>
        </section>

        {/* Section Rapport Certifié */}
        {hasReport && (
          <section id="reportSection" className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative">
            {isHorsSujet && (
              <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                <div className="transform -rotate-25 border-8 border-red-600/35 text-red-600/35 font-cinzel font-black text-4xl sm:text-6xl px-8 py-4 rounded-3xl uppercase text-center">
                  HORS-SUJET
                  <div className="text-2xl mt-2 tracking-normal font-sans">
                    NOTE OFFICIELLE : 0 / 10
                  </div>
                </div>
              </div>
            )}

            <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <div className="font-cinzel text-amber-400 text-xs uppercase font-semibold">
                  Procès-Verbal d'Évaluation Didactique
                </div>
                <h3 className="font-cinzel text-xl sm:text-2xl font-black text-white mt-1">
                  Rapport Officiel de Correction
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Candidat : <span className="text-white font-semibold">{studentName || 'CANDIDAT'}</span> — Filière : <span className="text-white font-semibold">{filiere}</span>
                </p>
              </div>

              <div className="flex flex-col items-center sm:items-end">
                <div className="text-xs uppercase text-slate-400 font-semibold mb-1">
                  Note Globale Certifiée
                </div>
                <div id="scoreBadge" className="font-mono text-2xl font-black px-4 py-1.5 rounded-xl border border-amber-300 text-amber-800 bg-amber-50">
                  {isHorsSujet ? '0.0 / 10' : '0.00 / 10'}
                </div>
              </div>
            </div>

            {isHorsSujet && (
              <div className="bg-red-50 border-b border-red-200 p-6 text-red-900">
                <div className="flex items-center gap-3 text-red-700 font-bold text-base">
                  <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
                  <span>Sanction Académique Éliminatoire : Copie Hors-Sujet (0 / 10)</span>
                </div>
                <p className="text-sm text-red-800 mt-2 pl-9">
                  {offTopicType === 'METHODOLOGIQUE'
                    ? "Erreur méthodologique majeure : Le sujet impose une prise de position et un plan d'opinion, or la copie traite un plan analytique (causes et solutions). Note : 0/10."
                    : "Divergence thématique majeure : La copie ne traite pas la consigne de l'examen."}
                </p>
              </div>
            )}

            {!isHorsSujet && (
              <div className="p-6 sm:p-8 space-y-10">
                {/* 1. Grille */}
                <div>
                  <h4 className="font-cinzel text-base font-bold text-navy-primary flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                    <Award className="w-5 h-5 text-amber-600" />
                    1. Grille d'Évaluation Officielle du Baccalauréat (10 Points)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Consigne (/2)</div>
                      <div id="g_consigne" className="font-mono text-lg font-bold text-slate-800 mt-1">-</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Structure (/2)</div>
                      <div id="g_structure" className="font-mono text-lg font-bold text-slate-800 mt-1">-</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Arguments (/2)</div>
                      <div id="g_arguments" className="font-mono text-lg font-bold text-slate-800 mt-1">-</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Langue (/2.5)</div>
                      <div id="g_langue" className="font-mono text-lg font-bold text-slate-800 mt-1">-</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                      <div className="text-[11px] font-bold text-slate-500 uppercase">Lexique (/1.5)</div>
                      <div id="g_lexique" className="font-mono text-lg font-bold text-slate-800 mt-1">-</div>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                      <div className="text-[11px] font-bold text-amber-800 uppercase">Total (/10)</div>
                      <div id="gNote" className="font-mono text-lg font-black text-amber-900 mt-1">-</div>
                    </div>
                  </div>
                </div>

                {/* 2. Transcription */}
                <div>
                  <h4 className="font-cinzel text-base font-bold text-navy-primary flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                    <FileText className="w-5 h-5 text-amber-600" />
                    2. Transcription Intégrale de la Copie
                  </h4>
                  <div id="outTrans" className="writing-ruled-zone p-6 bg-slate-50/50 rounded-2xl border border-slate-200 leading-loose" />
                </div>

                {/* 3. Diagnostic des fautes */}
                <div>
                  <h4 className="font-cinzel text-base font-bold text-navy-primary flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    3. Diagnostic Chirurgical des Fautes Linguistiques (4 Colonnes)
                  </h4>
                  <div id="outTableau" className="overflow-x-auto text-sm" />
                </div>

                {/* 4. Audit Pédagogique */}
                <div>
                  <h4 className="font-cinzel text-base font-bold text-navy-primary flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                    <Scale className="w-5 h-5 text-indigo-600" />
                    4. Audit Didactique Complet
                  </h4>
                  <div id="outBilan" className="prose max-w-none text-slate-800 text-sm leading-relaxed" />
                </div>

                {/* 5. Reformulation */}
                <div>
                  <h4 className="font-cinzel text-base font-bold text-navy-primary flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                    5. Optimisation Stylistique (Niveau 1ère Bac)
                  </h4>
                  <div id="outRef" className="prose max-w-none text-slate-800 text-sm leading-relaxed" />
                </div>

                {/* 6. Modèles Rédigés */}
                <div>
                  <h4 className="font-cinzel text-base font-bold text-navy-primary flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    6. Modèles de Référence d'Excellence
                  </h4>
                  <div id="outModel" className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200 font-newsreader text-base leading-relaxed" />
                </div>
              </div>
            )}

            {/* Barre de boutons d'impression et PDF */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-6 no-print flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <button
                  onClick={handleExportPdf}
                  disabled={isGeneratingPdf}
                  className="h-12 px-5 rounded-xl bg-navy-primary hover:bg-navy-deep text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-amber-400" />
                  <span>{isGeneratingPdf ? 'Génération du PDF...' : 'Télécharger le Document PDF'}</span>
                </button>
                <button
                  onClick={handlePrintPdf}
                  className="h-12 px-5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Imprimer</span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <span className="text-xs font-bold text-slate-500 uppercase">Archiver dans :</span>
                <select
                  onChange={(e) => {
                    const val = e.target.value as 'boite' | 'antigone' | 'condamne';
                    if (val) handleSaveToWorkBox(val);
                  }}
                  defaultValue=""
                  className="h-12 px-4 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 shadow-sm"
                >
                  <option value="" disabled>Choisir l'œuvre...</option>
                  <option value="boite">📦 La Boîte à Merveilles</option>
                  <option value="antigone">📜 Antigone</option>
                  <option value="condamne">⚖️ Le Dernier Jour d'un Condamné</option>
                </select>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Modal Changement Mot de Passe */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-cinzel font-bold text-base sm:text-lg text-navy-primary flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                Sécurité & Accès Enseignant
              </h3>
              <button onClick={() => setShowChangeModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ancien mot de passe</label>
                <input
                  type="password"
                  value={oldPasswordInput}
                  onChange={(e) => setOldPasswordInput(e.target.value)}
                  placeholder="Mot de passe actuel"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              {changeFeedback && (
                <div className={`p-3 rounded-xl text-xs font-semibold ${changeFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                  {changeFeedback.message}
                </div>
              )}

              <button type="submit" disabled={isChanging} className="w-full h-12 rounded-xl bg-navy-primary hover:bg-navy-deep text-white font-bold text-sm">
                {isChanging ? 'Modification en cours...' : 'Mettre à jour le mot de passe'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Boîtes d'Archives */}
      {selectedWorkBox && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-cinzel font-bold text-lg text-navy-primary flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-amber-600" />
                Boîte des Copies Archivées
              </h3>
              <button onClick={() => setSelectedWorkBox(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-100 p-2 gap-2">
              <button onClick={() => setSelectedWorkBox('boite')} className={`flex-1 py-2 rounded-xl text-xs font-bold ${selectedWorkBox === 'boite' ? 'bg-white text-navy-primary shadow-sm' : 'text-slate-600'}`}>
                📦 La Boîte ({archives.boite?.length || 0})
              </button>
              <button onClick={() => setSelectedWorkBox('antigone')} className={`flex-1 py-2 rounded-xl text-xs font-bold ${selectedWorkBox === 'antigone' ? 'bg-white text-navy-primary shadow-sm' : 'text-slate-600'}`}>
                📜 Antigone ({archives.antigone?.length || 0})
              </button>
              <button onClick={() => setSelectedWorkBox('condamne')} className={`flex-1 py-2 rounded-xl text-xs font-bold ${selectedWorkBox === 'condamne' ? 'bg-white text-navy-primary shadow-sm' : 'text-slate-600'}`}>
                ⚖️ Condamné ({archives.condamne?.length || 0})
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {(archives[selectedWorkBox] || []).length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Aucun dossier archivé dans cette boîte pour le moment.
                </div>
              ) : (
                archives[selectedWorkBox].map((entry: any) => (
                  <div key={entry.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{entry.candidateName}</div>
                      <div className="text-xs text-slate-500">
                        {entry.filiere} — Note : <span className="font-bold text-amber-700">{entry.score}</span> — {entry.date}
                      </div>
                      <div className="text-xs text-slate-600 mt-1 line-clamp-1 italic">
                        « {entry.sujet} »
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
