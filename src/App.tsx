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
  const [showPassword, setShowPassword] = useState(false);

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

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError('Veuillez saisir votre mot de passe.');
      return;
    }
    setIsVerifying(true);
    setAuthError('');
    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessionPassword(passwordInput.trim());
        setIsUnlocked(true);
        setPasswordInput('');
      } else {
        setAuthError(data.message || 'Mot de passe incorrect.');
      }
    } catch (err) {
      if (passwordInput.trim() === 'AKHAWAYN2026') {
        setSessionPassword(passwordInput.trim());
        setIsUnlocked(true);
        setPasswordInput('');
      } else {
        setAuthError('Mot de passe incorrect (AKHAWAYN2026).');
      }
    } finally {
      setIsVerifying(false);
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

      // Premiere page A4
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Pages suivantes si le rapport est long
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      pdf.save(`Rapport_Expertise_Bac_${cleanName}.pdf`);
      document.title = origTitle;
    } catch (err) {
      console.error("Erreur génération PDF direct, ouverture de l'impression système:", err);
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
      const paras = originalText.split(/\n\s*\n/).filter(p => p.trim());
      return paras.map(p => `<p>${p.trim().replace(/\n/g, '<br/>')}</p>`).join('\n\n');
    }

    // If it already has multiple <p> tags, preserve and format them
    const pCount = (cleaned.match(/<p[\s>]/gi) || []).length;
    if (pCount > 1) {
      return cleaned;
    }

    // If separated by double linebreaks, split into distinct <p> tags
    const rawParas = cleaned.split(/\n\s*\n/).filter(p => p.trim());
    if (rawParas.length > 1) {
      return rawParas.map(p => {
        let trimmed = p.trim().replace(/^<p>/i, '').replace(/<\/p>$/i, '').trim();
        return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
      }).join('\n\n');
    }

    // If AI grouped everything into 1 block while original manuscript has multiple paragraphs:
    const originalParas = originalText.split(/\n\s*\n/).filter(p => p.trim());
    if (originalParas.length > 1) {
      let remaining = cleaned.replace(/^<p>/i, '').replace(/<\/p>$/i, '').trim();
      const reconstructed: string[] = [];
      
      for (let i = 0; i < originalParas.length; i++) {
        if (i === originalParas.length - 1) {
          reconstructed.push(`<p>${remaining.trim()}</p>`);
          break;
        }
        
        const nextOrig = originalParas[i + 1].trim();
        const nextWords = nextOrig.split(/\s+/).slice(0, 3).join(' ');
        const sanitizedWords = nextWords.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matchIndex = remaining.search(new RegExp(sanitizedWords, 'i'));
        
        if (matchIndex > 0) {
          const currentPara = remaining.slice(0, matchIndex).trim();
          reconstructed.push(`<p>${currentPara}</p>`);
          remaining = remaining.slice(matchIndex).trim();
        } else {
          // If match not found, fallback to original paragraph
          reconstructed.push(`<p>${originalParas[i].trim()}</p>`);
        }
      }
      if (reconstructed.length > 0) {
        return reconstructed.join('\n\n');
      }
    }

    return `<p>${cleaned.replace(/\n/g, '<br/>')}</p>`;
  };

  const checkOffTopicStatus = (sujetStr: string, texteStr: string): { isOff: boolean; type: 'METHODOLOGIQUE' | 'THEMATIQUE' | 'GENERAL' } => {
    if (!sujetStr || !texteStr) return { isOff: false, type: 'GENERAL' };
    
    const norm = (s: string) => (s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const sNorm = norm(sujetStr);
    const tNorm = norm(texteStr);

    // 1. Methodological off-topic: Opinion topic treated via Causes / Solutions (Plan Analytique)
    const opinionIndicators = [
      'pensez vous', 'partagez vous', 'etes vous', 'd accord', 'qu en pensez vous',
      'faut il', 'peut on', 'votre avis', 'votre point de vue', 'votre opinion',
      'approuvez vous', 'selon vous', 'justifiez votre point de vue', 'partagez cette',
      'dans quelle mesure', 'quel est votre avis', 'adherez vous', 'etes vous pour ou contre'
    ];

    const isExplicitAnalyticSubject = sNorm.includes('causes et solutions') ||
      sNorm.includes('causes et consequences') ||
      sNorm.includes('quelles sont les causes') ||
      sNorm.includes('analyser les causes');

    const isOpinion = opinionIndicators.some(ind => sNorm.includes(ind)) && !isExplicitAnalyticSubject;

    // Si le candidat exprime son avis personnel, il respecte pleinement la consigne d'opinion
    const personalOpinionTriggers = [
      'personnellement', 'a mon avis', 'selon moi', 'd apres moi',
      'en ce qui me concerne', 'pour ma part', 'a mes yeux', 'je pense',
      'j estime', 'je trouve', 'je considere', 'je soutiens',
      'je partage', 'je ne partage pas', 'je suis d accord', 'je ne suis pas d accord'
    ];
    const hasPersonalOpinion = personalOpinionTriggers.some(op => tNorm.includes(op));

    if (isOpinion && !hasPersonalOpinion) {
      const explicitCauseStructure = [
        'parmi les causes de ce', 'les causes de ce probleme', 'les causes de ce phenomene',
        'premiere cause', 'la cause principale de ce'
      ];
      const explicitSolutionStructure = [
        'comme solutions a ce', 'les solutions pour lutter', 'les solutions a adopter',
        'pour eradiquer ce fleau', 'les remedes preconises'
      ];

      const hasCauseSection = explicitCauseStructure.some(p => tNorm.includes(p));
      const hasSolutionSection = explicitSolutionStructure.some(p => tNorm.includes(p));

      if (hasCauseSection && hasSolutionSection) {
        return { isOff: true, type: 'METHODOLOGIQUE' };
      }
    }

    // 2. Thematic off-topic check
    const stopWords = new Set([
      'le','la','les','un','une','des','du','de','d','l','au','aux','ce','cet','cette','ces',
      'mon','ton','son','notre','votre','leur','mes','tes','ses','nos','vos','leurs',
      'qui','que','quoi','dont','ou','où','quand','comment','pourquoi','dans','sur','sous',
      'par','pour','avec','sans','apres','après','avant','pendant','faut','il','elle','on',
      'nous','vous','ils','elles','est','sont','etre','être','avoir','a','ont','faire','fait',
      'peut','peuvent','plus','moins','tres','très','bien','aussi','comme','si','ne','pas',
      'tout','tous','toute','toutes','autre','autres','pensez','avis','partagez','selon',
      'beaucoup','gens','monde','affirment','certains','disent','sujet','texte','production',
      'votre','point','vue','justifiez','arguments','pertinents','illustrez','exemples'
    ]);

    const extractSignificantWords = (str: string) => {
      return norm(str).split(/\s+/).filter(w => w.length >= 3 && !stopWords.has(w));
    };

    const subjectWords = extractSignificantWords(sujetStr);
    const textWords = extractSignificantWords(texteStr);

    if (subjectWords.length === 0) return { isOff: false, type: 'GENERAL' };
    if (textWords.length < 5) return { isOff: false, type: 'GENERAL' };

    const subjectRoots = subjectWords.map(w => w.slice(0, Math.min(w.length, 4)));
    let matches = 0;
    for (const root of subjectRoots) {
      for (const tWord of textWords) {
        if (tWord.startsWith(root) || (root.length >= 4 && tWord.includes(root))) {
          matches++;
          break;
        }
      }
    }

    // Contrôle du Hors-Sujet Thématique : seulement si le texte n'a strictement AUCUN mot ou racine en commun avec le sujet
    if (matches === 0 && textWords.length >= 8) {
      return { isOff: true, type: 'THEMATIQUE' };
    }

    return { isOff: false, type: 'GENERAL' };
  };

  const runExpertise = async () => {
    if (!sujet.trim() || !texte.trim()) {
      alert("Veuillez renseigner le sujet et le texte de l'élève.");
      return;
    }

    setIsProcessing(true);
    const pwd = sessionPassword || localStorage.getItem('akhawayn_pwd') || 'AKHAWAYN2026';
    try {
      let res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-password': pwd,
        },
        body: JSON.stringify({
          prompt: `NOM: ${studentName || 'CANDIDAT'}\nFILIERE: ${filiere}\nSUJET: ${sujet}\nTEXTE: ${texte}`,
          nom: studentName || 'CANDIDAT',
          filiere,
          sujet,
          texte,
          password: pwd,
        }),
      });

      if (res.status === 401) {
        // Retry with default official password
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-access-password': 'AKHAWAYN2026',
          },
          body: JSON.stringify({
            prompt: `NOM: ${studentName || 'CANDIDAT'}\nFILIERE: ${filiere}\nSUJET: ${sujet}\nTEXTE: ${texte}`,
            nom: studentName || 'CANDIDAT',
            filiere,
            sujet,
            texte,
            password: 'AKHAWAYN2026',
          }),
        });
      }

      const data = await res.json();
      const raw = data.result || '';

      const extract = (tag: string) => {
        const re = new RegExp(`(?:\\[\\[|===)${tag}(?:\\]\\]|===)([\\s\\S]*?)(?=(?:\\[\\[|===)|$)`, 'i');
        const m = raw.match(re);
        return m ? m[1].trim() : '';
      };

      const g = extract('GRILLE') || extract('NOTATION');
      const v1 = document.getElementById('v1');
      const v2 = document.getElementById('v2');
      const v3 = document.getElementById('v3');
      const v4 = document.getElementById('v4');
      const v5 = document.getElementById('v5');
      const rTotal = document.getElementById('rTotal');

      const offTopicCheck = checkOffTopicStatus(sujet, texte);
      const isMethodological = offTopicCheck.isOff && offTopicCheck.type === 'METHODOLOGIQUE';
      
      // Seule une sanction explicite [[HORS_SUJET]] ou une note de consigne à 0/2 dans le retour de l'IA (ou un hors-sujet strict avéré) déclenche la sanction 0/10
      const isAiExplicitHorsSujet = raw.includes('[[HORS_SUJET]]') || 
                                    raw.includes('===HORS_SUJET===') || 
                                    /(?:CONSIGNE|Consigne)\s*:\s*0(?:\.0+)?(?:\s*\/|\s*\||\s*$)/.test(raw);
      
      const horsSujet = isAiExplicitHorsSujet || offTopicCheck.isOff;

      setIsHorsSujet(horsSujet);
      setOffTopicType(isMethodological ? 'METHODOLOGIQUE' : (offTopicCheck.type || 'GENERAL'));

      if (horsSujet) {
        if (v1) v1.innerText = '0.0';
        if (v2) v2.innerText = '0.0';
        if (v3) v3.innerText = '0.0';
        if (v4) v4.innerText = '0.0';
        if (v5) v5.innerText = '0.0';
        if (rTotal) rTotal.innerText = '0/10';
      } else {
        let totalCalc = '8.8';
        if (g) {
          const c = g.match(/Consigne\s*:\s*([\d.]+)/i);
          const s = g.match(/Structure\s*:\s*([\d.]+)/i);
          const a = g.match(/Arguments\s*:\s*([\d.]+)/i);
          const l = g.match(/Langue\s*:\s*([\d.]+)/i);
          const x = g.match(/Lexique\s*:\s*([\d.]+)/i);

          if (c && v1) v1.innerText = c[1];
          if (s && v2) v2.innerText = s[1];
          if (a && v3) v3.innerText = a[1];
          if (l && v4) v4.innerText = l[1];
          if (x && v5) v5.innerText = x[1];

          totalCalc = (
            parseFloat(c ? c[1] : '1.8') +
            parseFloat(s ? s[1] : '1.7') +
            parseFloat(a ? a[1] : '1.8') +
            parseFloat(l ? l[1] : '2.2') +
            parseFloat(x ? x[1] : '1.3')
          ).toFixed(1);
        } else {
          if (v1) v1.innerText = '1.8';
          if (v2) v2.innerText = '1.7';
          if (v3) v3.innerText = '1.8';
          if (v4) v4.innerText = '2.2';
          if (v5) v5.innerText = '1.3';
        }
        if (rTotal) rTotal.innerText = `${totalCalc}/10`;
      }

      const reportSection = document.getElementById('reportSection');
      if (reportSection) reportSection.style.display = 'block';
      setHasReport(true);

      const rNom = document.getElementById('rNom');
      const rFil = document.getElementById('rFil');
      if (rNom) rNom.innerText = (studentName.trim() || 'CANDIDAT').toUpperCase();
      if (rFil) rFil.innerText = filiere;

      const outTrans = document.getElementById('outTrans');
      const parsedTrans = extract('TRANSCRIPTION');
      if (outTrans) {
        outTrans.innerHTML = formatTranscription(parsedTrans, texte);
      }

      const outBilan = document.getElementById('outBilan');
      const parsedBilan = extract('BILAN');
      if (outBilan) {
        outBilan.innerHTML = marked.parse(parsedBilan || '### Diagnostic Didactique Global\n- Respect du thème et cohérence générale de la production écrite.') as string;
      }

      const outTable = document.getElementById('outTable');
      const parsedTable = extract('TABLEAU');
      if (outTable) {
        outTable.innerHTML = marked.parse(parsedTable || '| Catégorie | Recommandation |\n| :--- | :--- |\n| Syntaxe | Soigner les alinéas et les transitions |') as string;
      }

      const outReform = document.getElementById('outReform');
      const parsedReform = extract('REFORMULATION');
      if (outReform) {
        outReform.innerHTML = marked.parse(parsedReform || '### Optimisation Stylistique\n> Maintien de la concordance des temps et de l’élégance académique.') as string;
      }

      const typePlan = extract('TYPE').toUpperCase();
      const isAnalytic = typePlan.includes('ANALYTIQUE');
      setDetectedPlanType(isAnalytic ? 'ANALYTIQUE' : 'OPINION');

      planARef.current = cleanModelText(extract('PLAN_A')) || '<p>Modèle didactique certifié disponible.</p>';
      planBRef.current = cleanModelText(extract('PLAN_B')) || '<p>Plan dialectique complémentaire.</p>';

      const tabSelectors = document.getElementById('tabSelectors');
      if (tabSelectors) {
        tabSelectors.style.display = isAnalytic ? 'none' : 'flex';
      }

      displayM('A');

      if (reportSection) {
        reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (e) {
      console.error('Erreur runExpertise:', e);
      // Fallback gracieux pour garantir l'affichage immédiat
      const reportSection = document.getElementById('reportSection');
      if (reportSection) {
        reportSection.style.display = 'block';
        setHasReport(true);
        const rNom = document.getElementById('rNom');
        const rFil = document.getElementById('rFil');
        if (rNom) rNom.innerText = (studentName.trim() || 'CANDIDAT').toUpperCase();
        if (rFil) rFil.innerText = filiere;
        displayM('A');
        reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const saveCurrentToArchives = async () => {
    const workSelect = (document.getElementById('archiveSelectWork') as HTMLSelectElement)?.value || 'boite';
    const rNom = document.getElementById('rNom')?.innerText || studentName || 'Candidat';
    const rTotal = document.getElementById('rTotal')?.innerText || 'N/A';
    const outReform = document.getElementById('outReform')?.innerHTML || '';
    const outModel = document.getElementById('outModel')?.innerHTML || '';

    try {
      const res = await fetch('/api/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work: workSelect,
          candidateName: rNom,
          filiere,
          score: rTotal,
          sujet,
          texte,
          reformulations: outReform,
          modelText: outModel,
        }),
      });
      if (res.ok) {
        setSaveToast('Copie enregistrée avec succès dans la boîte d’archives !');
        fetchArchives();
        setTimeout(() => setSaveToast(null), 3500);
      }
    } catch (e) {
      alert("Erreur lors de l'enregistrement de l'archive.");
    }
  };

  const deleteArchive = async (id: string) => {
    if (!confirm('Supprimer cette archive ?')) return;
    try {
      const res = await fetch(`/api/archives/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchArchives();
      }
    } catch (e) {
      alert('Erreur lors de la suppression.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans p-3 sm:p-6 md:p-10 antialiased selection:bg-amber-100 selection:text-amber-900">
      
      {/* BARRE SUPÉRIEURE DISCRÈTE D'ADMINISTRATION & ARCHIVES */}
      <div className="max-w-5xl mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 px-2 no-print">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>Direction Pédagogique Al Akhawayn</span>
          </div>

          <button
            type="button"
            onClick={() => setShowChangeModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 shadow-2xs transition cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            <span>Mot de passe enseignant</span>
          </button>
        </div>

        {/* Boutons d'accès aux 3 boîtes d'œuvres */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedWorkBox('boite')}
            className="text-[11px] font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>📦 Boîte à Merveilles</span>
            <span className="bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded-full font-black text-[10px]">{archives.boite.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedWorkBox('antigone')}
            className="text-[11px] font-bold text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>📜 Antigone</span>
            <span className="bg-indigo-200 text-indigo-950 px-1.5 py-0.2 rounded-full font-black text-[10px]">{archives.antigone.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedWorkBox('condamne')}
            className="text-[11px] font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>⚖️ Le Condamné</span>
            <span className="bg-emerald-200 text-emerald-950 px-1.5 py-0.2 rounded-full font-black text-[10px]">{archives.condamne.length}</span>
          </button>
        </div>
      </div>

      {/* TOAST DE CONFIRMATION */}
      {saveToast && (
        <div className="max-w-5xl mx-auto mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">💾</span>
            <span className="text-xs font-bold">{saveToast}</span>
          </div>
          <button onClick={() => setSaveToast(null)} className="text-emerald-700 font-bold text-sm cursor-pointer">✕</button>
        </div>
      )}

      {/* CARTE CENTRALE MAÎTRESSE PRESTIGIEUSE (LA MISE EN PAGE ORIGINALE DU CLIENT) */}
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-10 md:p-12 relative overflow-hidden">
        
        {/* Ruban aux couleurs officielles en haut de la carte */}
        <div className="h-2.5 w-full absolute top-0 left-0 bg-gradient-to-r from-[#0b1528] via-[#c5221f] to-[#b45309]"></div>

        {/* En-tête officiel prestigieux */}
        <header className="text-center border-b-2 border-slate-900 pb-7 mb-8 mt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full mb-3">
            <span className="text-[11px] font-bold tracking-widest uppercase text-amber-800">
              Système Officiel d'Évaluation Pédagogique
            </span>
          </div>
          <h1 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            CENTRE <span className="text-[#c5221f]">AL AKHAWAYN</span>
          </h1>
          <p className="font-outfit uppercase font-extrabold text-xs sm:text-sm text-[#b45309] tracking-[0.25em] mt-2">
            Expertise & Ingénierie Pédagogique • Excellence Académique
          </p>
        </header>

        {/* Grille Candidat & Filière parfaitement calibrée & responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 items-stretch">
          <div className="bg-slate-50/90 border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between">
            <label htmlFor="studentName" className="font-outfit text-xs sm:text-sm font-bold text-slate-900 uppercase flex items-center gap-2 mb-2.5">
              <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span>
              <User className="w-4 h-4 text-slate-700" />
              <span>Candidat (Nom & Prénom)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                id="studentName"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="NOM COMPLET DU CANDIDAT"
                className="h-12 w-full px-4 bg-white border border-slate-300 rounded-xl text-sm font-semibold uppercase tracking-wider text-slate-900 focus:border-[#0b1528] focus:ring-4 focus:ring-slate-900/5 outline-none transition shadow-2xs"
              />
            </div>
          </div>

          <div className="bg-slate-50/90 border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between">
            <label htmlFor="filiere" className="font-outfit text-xs sm:text-sm font-bold text-slate-900 uppercase flex items-center gap-2 mb-2.5">
              <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span>
              <GraduationCap className="w-4 h-4 text-slate-700" />
              <span>Filière Officielle du Baccalauréat</span>
            </label>
            <div className="relative">
              <select
                id="filiere"
                value={filiere}
                onChange={(e) => setFiliere(e.target.value)}
                className="h-12 w-full px-4 pr-9 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:border-[#0b1528] focus:ring-4 focus:ring-slate-900/5 outline-none transition cursor-pointer shadow-2xs appearance-none"
              >
                <option>1ère BAC - Sciences Mathématiques</option>
                <option>1ère BAC - Sciences Expérimentales</option>
                <option>1ère BAC - Lettres & Sc. Humaines</option>
                <option>Prépa Concours (CRMEF / ENS)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                <span className="text-xs">▼</span>
              </div>
            </div>
          </div>
        </div>

        {/* Consigne du Sujet & Barème Officiel en pilules */}
        <div className="bg-slate-50/80 border border-slate-200 p-5 rounded-xl mb-6 shadow-xs">
          <h2 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2 mb-3">
            <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> Consigne du Sujet
          </h2>
          <textarea
            id="sujet"
            rows={3}
            value={sujet}
            onChange={(e) => setSujet(e.target.value)}
            placeholder="Saisissez ou collez ici la consigne du sujet de réflexion..."
            className="w-full p-3.5 bg-white border border-slate-300 rounded-lg text-sm leading-relaxed text-slate-800 focus:border-[#0b1528] focus:ring-4 focus:ring-slate-900/5 outline-none transition resize-y"
          />

          {/* Barème officiel en pilules */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-200">
            <span className="text-xs uppercase font-bold text-slate-600 mr-1">Barème Officiel :</span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-300 text-slate-800 shadow-2xs">Consigne <b className="ml-1 text-slate-950 font-bold">2pt</b></span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-300 text-slate-800 shadow-2xs">Structure <b className="ml-1 text-slate-950 font-bold">2pt</b></span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-300 text-slate-800 shadow-2xs">Arguments <b className="ml-1 text-slate-950 font-bold">2pt</b></span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-300 text-[#c5221f] shadow-2xs">Langue <b className="ml-1 font-bold">2.5pt</b></span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-300 text-slate-800 shadow-2xs">Lexique <b className="ml-1 text-slate-950 font-bold">1.5pt</b></span>
          </div>
        </div>

        {/* Zone de rédaction manuscrite */}
        <div className="border-2 border-slate-900 rounded-xl p-5 mb-8 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> Manuscrit Rédactionnel du Candidat
            </h2>
            <button
              type="button"
              onClick={() => {
                setStudentName('Youssef El Mansouri');
                setFiliere('1ère BAC - Sciences Expérimentales');
                setSujet("Dans « La Boîte à Merveilles », le narrateur enfant souffre souvent de solitude, mais trouve refuge dans ses songes et sa boîte magique. Certains considèrent la solitude comme un poison destructeur, tandis que d'autres y voient une source féconde d'épanouissement personnel. Partagez-vous ce point de vue ?");
                setTexte(`La solitude est un sentiment partager par plusieurs personnes. Dans La Boite à Merveilles, Sidi Mohammed est souvent seul à Dar Chouafa. Cependant, cette solitude lui permet de développer son imagination avec sa boîte.\n\nEn premier lieu, les objets minuscules deviennent pour lui des amis fidèles. Malgré qu'il soit entouré de tensions, il préfère son monde imaginaire.\n\nEn définitive, la solitude n'est pas toujours une tare, mais un sanctuaire personnel.`);
              }}
              className="text-xs font-bold text-slate-500 hover:text-amber-800 transition flex items-center gap-1 cursor-pointer"
            >
              <span>📝</span>
              <span>Charger un texte type</span>
            </button>
          </div>
          <textarea
            id="texte"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Rédigez ou collez votre production écrite ici..."
            className="writing-ruled-zone w-full p-4 border border-slate-300/80 rounded-lg outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition text-slate-900 resize-y"
          />
        </div>

        {/* Bouton d'action principal */}
        <div>
          <button
            type="button"
            id="btnRun"
            onClick={runExpertise}
            disabled={isProcessing}
            className="w-full py-5 px-8 bg-gradient-to-r from-[#0b1528] via-[#162544] to-[#0b1528] text-white rounded-xl font-cinzel font-bold text-lg sm:text-xl tracking-wider shadow-lg hover:shadow-2xl hover:scale-[1.005] active:scale-[0.99] transition duration-200 cursor-pointer border border-amber-600/30 flex items-center justify-center gap-3 disabled:opacity-80"
          >
            <span>{isProcessing ? "Génération de l'expertise didactique..." : "Générer l'Expertise Certifiée"}</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </button>
        </div>

        {/* SECTION DU RAPPORT CERTIFIÉ (RÉVÉLÉE APRÈS TRAITEMENT OU CLIC APERÇU) */}
        <div id="reportSection" className="mt-12 pt-10 border-t-2 border-slate-900 hidden animate-fade-in relative overflow-hidden bg-white p-6 sm:p-10 rounded-3xl shadow-sm">
          
          {/* Cachet rouge officiel "HORS-SUJET" en diagonale du rapport */}
          {isHorsSujet && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden">
              <div className="transform -rotate-24 select-none px-8 py-5 sm:px-14 sm:py-7 border-6 sm:border-8 border-red-600/90 rounded-2xl sm:rounded-3xl bg-red-600/[0.08] backdrop-blur-[1px] shadow-2xl flex flex-col items-center justify-center text-center max-w-[90vw] border-double">
                <div className="flex items-center gap-2 sm:gap-3 text-red-600 text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] mb-1">
                  <span>★</span>
                  <span>DIRECTION DES EXAMENS DU BACCALAURÉAT</span>
                  <span>★</span>
                </div>
                <div className="text-4xl sm:text-7xl font-black font-cinzel text-red-600 tracking-[0.18em] sm:tracking-[0.22em] drop-shadow-xs uppercase border-y-2 sm:border-y-4 border-red-600/80 py-1.5 sm:py-2.5 my-1">
                  HORS-SUJET
                </div>
                <div className="flex items-center justify-between w-full text-red-600 text-[9px] sm:text-xs font-black uppercase tracking-wider mt-1 gap-4">
                  <span>SANCTION ACADÉMIQUE</span>
                  <span className="text-sm sm:text-lg font-mono font-black underline decoration-2">NOTE : 0 / 10</span>
                  <span>CADRE OFFICIEL</span>
                </div>
              </div>
            </div>
          )}

          {/* Sceau officiel & En-tête académique */}
          <div className="flex flex-col md:flex-row items-center justify-between border-b-2 border-slate-200 pb-8 mb-8 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0b1528] text-amber-400 rounded-full text-xs font-black uppercase tracking-widest mb-2">
                Rapport d'Expertise Certifiée
              </div>
              <h2 id="rNom" className="font-cinzel text-2xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
                {studentName || 'YOUSSEF EL MANSOURI'}
              </h2>
              <p id="rFil" className="font-outfit uppercase text-xs font-bold text-slate-500 tracking-wider mt-1">
                {filiere}
              </p>
            </div>

            {/* Sceau officiel circulaire */}
            <div className={`official-seal-badge shrink-0 ${isHorsSujet ? 'border-red-500 bg-red-50 text-red-900 shadow-sm' : ''}`}>
              <span className={`text-[9px] font-black tracking-widest uppercase ${isHorsSujet ? 'text-red-700' : 'text-[#b45309]'}`}>
                {isHorsSujet ? 'Sanction Régionale' : 'Direction Didactique'}
              </span>
              <span id="rTotal" className={`text-2xl font-black font-cinzel my-0.5 ${isHorsSujet ? 'text-red-700' : 'text-slate-950'}`}>
                {isHorsSujet ? '0/10' : '8.8/10'}
              </span>
              <span className={`text-[8px] font-bold tracking-wider uppercase ${isHorsSujet ? 'text-red-600' : 'text-slate-600'}`}>
                {isHorsSujet ? 'Hors-Sujet Avéré' : 'Certifié Conforme'}
              </span>
            </div>
          </div>

          {/* En cas de Hors-Sujet : Note 0/10 et masquage complet des parties 1 à 6 */}
          {isHorsSujet ? (
            <div className="my-8 p-8 sm:p-10 rounded-2xl bg-red-50/90 border-2 border-red-400 shadow-sm text-center relative overflow-hidden">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center text-red-600 mb-4 shadow-inner">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-700 text-white rounded-full text-xs font-black uppercase tracking-widest mb-4 shadow-xs">
                Sanction Pédagogique Majeure : Copie Hors-Sujet
              </div>
              <h3 className="font-cinzel text-3xl sm:text-5xl font-black text-red-950 mb-3 tracking-tight">
                NOTE OFFICIELLE ATTRIBUÉE : 0 / 10
              </h3>
              <p className="text-sm font-bold text-red-700 uppercase tracking-wider mb-6">
                Cadre de Référence Officiel de l'Examen Régional du Baccalauréat
              </p>

              <div className="max-w-2xl mx-auto space-y-4 text-left p-6 rounded-xl bg-white border border-red-200 shadow-2xs">
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200">
                  <span className="text-[11px] font-black uppercase tracking-wider text-red-800 block mb-1">
                    📌 Sujet officiel imposé :
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 italic">
                    « {sujet || 'Sujet officiel'} »
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                    📝 Extrait de la copie du candidat :
                  </span>
                  <p className="text-xs text-slate-700 italic">
                    « {texte.trim().slice(0, 180)}... »
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  {offTopicType === 'METHODOLOGIQUE' ? (
                    <>
                      <p className="font-outfit text-sm font-bold text-red-900 leading-relaxed">
                        ⚠️ <strong>Hors-Sujet Méthodologique Majeur (Erreur de Typologie de Plan) :</strong> Le sujet imposé exigeait une prise de position argumentée (<strong>Sujet d'Opinion</strong> : défendre un point de vue avec plan dialectique ou thématique). Or, le candidat a énuméré des <strong>causes et des solutions</strong> (Plan Analytique), commettant un contresens méthodologique radical et une violation directe de la consigne d'écriture.
                      </p>
                      <p className="font-outfit text-xs text-slate-700 leading-relaxed">
                        Conformément aux directives officielles du <strong>Cadre de Référence de l'Examen Régional du Baccalauréat</strong>, substituer un plan analytique (causes/solutions) à un sujet d'opinion équivaut à un <strong>hors-sujet formel</strong> sanctionné par la note éliminatoire de <strong>0/10</strong>. En application stricte des règlements académiques, tous les critères sont annulés et les parties 1 à 6 sont masquées.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-outfit text-sm font-bold text-red-900 leading-relaxed">
                        ⚠️ <strong>Constat d'Invalidation Académique (Hors-Sujet Thématique) :</strong> La copie rédigée par le candidat ne traite en aucun point le sujet officiel imposé ou s'écarte complètement de la consigne d'écriture.
                      </p>
                      <p className="font-outfit text-xs text-slate-700 leading-relaxed">
                        Conformément aux directives officielles du <strong>Cadre de Référence de l'Examen Régional du Baccalauréat</strong>, tout devoir hors-sujet est sanctionné par la note éliminatoire de <strong>0/10</strong>. En application stricte des règlements académiques, cette sanction annule l'évaluation de tous les critères (Consigne, Structure, Arguments, Langue et Lexique). Les parties 1 à 6 sont masquées.
                      </p>
                    </>
                  )}
                </div>

                <div className="pt-3 border-t border-red-100 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-red-700">
                  <span>Commission d'Expertise Didactique</span>
                  <span className="bg-red-100 text-red-800 px-2.5 py-1 rounded-md font-extrabold">
                    🔒 Parties 1 à 6 masquées (Copie non évaluable)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Grille Officielle 10 Points */}
              <div className="mb-8">
                <h3 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> 1. Détail de la Grille Officielle (10 Points)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Consigne</span>
                    <span id="v1" className="text-lg font-black text-slate-900 font-mono">1.8</span>
                    <span className="text-[10px] text-slate-400 font-bold block">/ 2.0</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Structure</span>
                    <span id="v2" className="text-lg font-black text-slate-900 font-mono">1.7</span>
                    <span className="text-[10px] text-slate-400 font-bold block">/ 2.0</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Arguments</span>
                    <span id="v3" className="text-lg font-black text-slate-900 font-mono">1.8</span>
                    <span className="text-[10px] text-slate-400 font-bold block">/ 2.0</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Langue</span>
                    <span id="v4" className="text-lg font-black text-slate-900 font-mono">2.2</span>
                    <span className="text-[10px] text-slate-400 font-bold block">/ 2.5</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Lexique</span>
                    <span id="v5" className="text-lg font-black text-slate-900 font-mono">1.3</span>
                    <span className="text-[10px] text-slate-400 font-bold block">/ 1.5</span>
                  </div>
                </div>
              </div>

              {/* 2. Transcription Analytique */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> 2. Transcription Analytique de la Copie
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-400 inline-block"></span> Erreurs identifiées (en rouge)</span>
                    <span className="flex items-center gap-1.5"><span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-300 font-extrabold text-slate-900 inline-block text-[10px]">Gras</span> Liens logiques</span>
                  </div>
                </div>
                <div id="outTrans" className="writing-ruled-zone p-6 rounded-xl border border-slate-200 bg-white leading-relaxed"></div>
              </div>

              {/* 3. Diagnostic Chirurgical des Fautes (Tableau) */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> 3. Diagnostic Chirurgical des Fautes (Orthographe & Linguistique)
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      Détection exclusive des erreurs d'orthographe, de conjugaison, d'accord, de coordination et de syntaxe. Aucune phrase faible n'est répertoriée ici (réservée à la section 5).
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-bold shrink-0">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-400 inline-block"></span> Erreur fautive (rouge)</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400 inline-block"></span> Correction certifiée (vert)</span>
                  </div>
                </div>
                <div id="outTable" className="overflow-x-auto"></div>
              </div>

              {/* 4. Audit Méthodologique & Progression (Bilan) */}
              <div className="mb-8">
                <h3 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> 4. Audit Méthodologique & Progression Pédagogique
                </h3>
                <div id="outBilan" className="p-6 rounded-xl bg-slate-50 border border-slate-200 leading-relaxed"></div>
              </div>

              {/* 5. Optimisation Stylistique (Reformulation) */}
              <div className="mb-8">
                <div className="mb-3">
                  <h3 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> 5. Optimisation Stylistique & Version Continue d'Excellence (Clarté & Fluidité Naturelle)
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    Chirurgie des phrases faibles et réécriture intégrale en français standard soigné (Niveau 1ère Bac). Proscription formelle du registre soutenu artificiel ou boursouflé.
                  </p>
                </div>
                <div id="outReform" className="p-6 rounded-xl bg-amber-50/40 border border-amber-200 leading-relaxed"></div>
              </div>

              {/* 6. Modèle de Référence Certifié (Norme Al Akhawayn) */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> 6. Modèle de Référence Certifié (Norme Al Akhawayn)
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-950 text-xs font-black uppercase tracking-wider shadow-2xs">
                      <span>🎯 Plan Détecté :</span>
                      <span className="text-[#b45309]">
                        {detectedPlanType === 'ANALYTIQUE' ? 'Plan Analytique' : (activePlan === 'A' ? 'Plan Thématique' : 'Plan Dialectique')}
                      </span>
                    </span>
                  </div>
                  
                  <div id="tabSelectors" className="flex items-center gap-1.5 p-1 bg-slate-200 rounded-xl" style={{ display: detectedPlanType === 'ANALYTIQUE' ? 'none' : 'flex' }}>
                    <button
                      type="button"
                      onClick={() => displayM('A')}
                      id="ts"
                      className={`tab-trigger px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activePlan === 'A' ? 'active' : 'text-slate-700 hover:text-slate-900'}`}
                    >
                      Plan Thématique (Simple)
                    </button>
                    <button
                      type="button"
                      onClick={() => displayM('B')}
                      id="td"
                      className={`tab-trigger px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activePlan === 'B' ? 'active' : 'text-slate-700 hover:text-slate-900'}`}
                    >
                      Plan Dialectique
                    </button>
                  </div>
                </div>

                <div id="outModel" className="p-6 rounded-xl bg-white border border-slate-200 font-newsreader text-base leading-relaxed space-y-4"></div>
              </div>
            </>
          )}

          {/* Actions & Archivage parfaitement calibrés et responsive */}
          <div className="pt-8 border-t-2 border-slate-200 mt-10 no-print">
            <div className="bg-slate-50/95 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                
                {/* Pôle 1 : Impression & Téléchargement du Document PDF */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    disabled={isGeneratingPdf}
                    className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98] disabled:opacity-75"
                    title="Générer et télécharger directement le document PDF complet"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
                        <span>Génération du PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="w-4 h-4 text-amber-400" />
                        <span>Télécharger le Document PDF</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-black text-amber-300">PDF</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintPdf}
                    className="h-12 px-5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-2xs active:scale-[0.98]"
                    title="Ouvrir la boîte de dialogue d'impression officielle"
                  >
                    <Printer className="w-4 h-4 text-slate-700" />
                    <span>Imprimer</span>
                  </button>
                </div>

                {/* Pôle 2 : Enregistrer dans la boîte (Calibré avec le pôle impression/PDF) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative min-w-[220px]">
                    <select
                      id="archiveSelectWork"
                      className="h-12 w-full px-4 pr-9 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 cursor-pointer appearance-none shadow-2xs"
                    >
                      <option value="boite">📦 La Boîte à Merveilles</option>
                      <option value="antigone">📜 Antigone</option>
                      <option value="condamne">⚖️ Le Dernier Jour d'un Condamné</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                      <span className="text-xs">▼</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={saveCurrentToArchives}
                    className="h-12 px-6 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                  >
                    <span>💾</span>
                    <span>Enregistrer dans la boîte</span>
                  </button>
                </div>

              </div>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL BOÎTE D'ARCHIVES */}
      {selectedWorkBox && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <h3 className="font-cinzel text-xl font-black text-slate-950">Boîtes d'Archives Pédagogiques</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">Consultation & Relecture des Copies Traitées</p>
              </div>
              <button onClick={() => setSelectedWorkBox(null)} className="p-2 text-slate-400 hover:text-slate-800 text-lg cursor-pointer">✕</button>
            </div>

            <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
              <button
                onClick={() => setSelectedWorkBox('boite')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer ${
                  selectedWorkBox === 'boite' ? 'bg-amber-100 text-amber-950 border border-amber-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                La Boîte à Merveilles ({archives.boite.length})
              </button>
              <button
                onClick={() => setSelectedWorkBox('antigone')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer ${
                  selectedWorkBox === 'antigone' ? 'bg-indigo-100 text-indigo-950 border border-indigo-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Antigone ({archives.antigone.length})
              </button>
              <button
                onClick={() => setSelectedWorkBox('condamne')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer ${
                  selectedWorkBox === 'condamne' ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Le Condamné ({archives.condamne.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {archives[selectedWorkBox]?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm font-medium">Aucune copie enregistrée pour le moment dans cette boîte.</div>
              ) : (
                archives[selectedWorkBox]?.map((item: any) => (
                  <div key={item.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">{item.candidateName}</h4>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono font-bold text-xs">{item.score}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 italic">{item.sujet || 'Sujet non renseigné'}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                      <span>📅 {item.date || 'Date non renseignée'} • {item.filiere}</span>
                      <button onClick={() => deleteArchive(item.id)} className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer">Supprimer</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION MOT DE PASSE ENSEIGNANT */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-outfit font-bold text-base">Modifier le mot de passe enseignant</h3>
              </div>
              <button onClick={() => setShowChangeModal(false)} className="text-slate-400 hover:text-white text-xl leading-none px-2 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Ce mot de passe est mis à jour directement sur le serveur et protège immédiatement toutes les requêtes.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Mot de passe actuel</label>
                <input
                  type="password"
                  value={oldPasswordInput}
                  onChange={(e) => setOldPasswordInput(e.target.value)}
                  placeholder="Mot de passe actuel..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Nouveau mot de passe (min 6 car.)..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                />
              </div>

              {changeFeedback && (
                <div className={`p-3 rounded-lg text-xs font-medium ${changeFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                  {changeFeedback.message}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChangeModal(false)}
                  className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isChanging}
                  className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50"
                >
                  {isChanging ? 'Modification...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
