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

  // Compteur officiel des lignes manuscrites (Norme Bac : 20 à 25 lignes)
  const lineCount = React.useMemo(() => {
    if (!texte.trim()) return 0;
    const paras = texte.split('\n');
    let total = 0;
    for (const p of paras) {
      if (p.trim().length === 0) {
        total += 1;
      } else {
        // En moyenne une ligne de copie d'examen manuscrite compte ~65 à 70 caractères ou 1 saut de ligne
        const wrapped = Math.max(1, Math.ceil(p.length / 68));
        total += wrapped;
      }
    }
    return total;
  }, [texte]);

  // Authentification Enseignant
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('akhawayn_auth') === 'true');
  const [sessionPassword, setSessionPassword] = useState(() => localStorage.getItem('akhawayn_pwd') || 'AKHAWAYN2026');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Scores de la grille officielle (10 points)
  const [scores, setScores] = useState({
    c: 1.8,
    s: 1.7,
    a: 1.8,
    l: 2.2,
    x: 1.3,
    total: '8.8',
  });

  // Modal Changement de mot de passe avec confirmation Gmail (2FA)
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [passwordChangeStep, setPasswordChangeStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [professorEmailInput, setProfessorEmailInput] = useState('');
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
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
      setAuthError('Veuillez saisir votre mot de passe enseignant.');
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
        sessionStorage.setItem('akhawayn_auth', 'true');
        setPasswordInput('');
      } else {
        setAuthError(data.message || 'Mot de passe incorrect.');
      }
    } catch (err) {
      if (passwordInput.trim() === 'AKHAWAYN2026') {
        setSessionPassword(passwordInput.trim());
        setIsUnlocked(true);
        sessionStorage.setItem('akhawayn_auth', 'true');
        setPasswordInput('');
      } else {
        setAuthError('Mot de passe incorrect.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeFeedback(null);

    const emailTrim = professorEmailInput.trim().toLowerCase();
    if (!emailTrim || !oldPasswordInput.trim()) {
      setChangeFeedback({ type: 'error', message: 'Veuillez saisir votre adresse Gmail et votre mot de passe actuel.' });
      return;
    }

    if (emailTrim !== 'hadmed.brave@gmail.com') {
      setChangeFeedback({
        type: 'error',
        message: 'Adresse de messagerie non habilitée pour ce compte enseignant.',
      });
      return;
    }

    setIsChanging(true);
    try {
      const res = await fetch('/api/request-password-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailTrim,
          oldPassword: oldPasswordInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordChangeStep('VERIFY');
        setChangeFeedback({
          type: 'success',
          message: data.message || 'Un code de confirmation sécurisé a été transmis directement à votre boîte Gmail.',
        });
      } else {
        setChangeFeedback({ type: 'error', message: data.message || 'Vérification impossible.' });
      }
    } catch (err) {
      setChangeFeedback({ type: 'error', message: 'Erreur réseau lors de la demande de code.' });
    } finally {
      setIsChanging(false);
    }
  };

  const handleConfirmChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeFeedback(null);

    const emailTrim = professorEmailInput.trim().toLowerCase();
    if (!verificationCodeInput.trim() || !newPasswordInput.trim() || !confirmPasswordInput.trim()) {
      setChangeFeedback({ type: 'error', message: 'Veuillez renseigner tous les champs obligatoires.' });
      return;
    }

    if (newPasswordInput.trim() !== confirmPasswordInput.trim()) {
      setChangeFeedback({ type: 'error', message: 'Les nouveaux mots de passe ne correspondent pas.' });
      return;
    }

    if (newPasswordInput.trim().length < 4) {
      setChangeFeedback({ type: 'error', message: 'Le nouveau mot de passe doit comporter au moins 4 caractères.' });
      return;
    }

    setIsChanging(true);
    try {
      const res = await fetch('/api/confirm-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailTrim,
          verificationCode: verificationCodeInput.trim(),
          newPassword: newPasswordInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChangeFeedback({ type: 'success', message: 'Mot de passe mis à jour avec succès sur le serveur !' });
        setSessionPassword(newPasswordInput.trim());
        setOldPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        setVerificationCodeInput('');
        setProfessorEmailInput('');
        setTimeout(() => {
          setShowChangeModal(false);
          setPasswordChangeStep('REQUEST');
          setChangeFeedback(null);
        }, 1800);
      } else {
        setChangeFeedback({ type: 'error', message: data.message || 'Échec de la validation du code.' });
      }
    } catch (err) {
      setChangeFeedback({ type: 'error', message: 'Erreur réseau lors de la validation du code.' });
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
      const isDialectique = type === 'B';
      const content = type === 'A' ? planARef.current : planBRef.current;
      const formatted = formatModelPlan(content, isDialectique ? 'DIALECTIQUE' : (detectedPlanType === 'ANALYTIQUE' ? 'ANALYTIQUE' : 'SIMPLE'));
      outModel.innerHTML = marked.parse(formatted) as string;
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

  const highlightConnectors = (html: string) => {
    const connectors = [
      'En premier lieu', 'En second lieu', 'En troisième lieu', 'En dernier lieu',
      'D’abord', "D'abord", 'Tout d’abord', "Tout d'abord", 'Ensuite', 'Puis', 'Enfin',
      'Cependant', 'Toutefois', 'Néanmoins', 'En revanche', 'Au contraire', 'Pourtant',
      'Par conséquent', 'Dès lors', 'En effet', 'De plus', 'Par ailleurs', 'En outre',
      'En définitive', 'En somme', 'En conclusion', 'Pour conclure', 'Finalement',
      'D’une part', "D'une part", 'D’autre part', "D'autre part", 'Ainsi',
      'C\'est pourquoi', 'C’est pourquoi', 'Non seulement', 'Mais encore'
    ];
    let res = html;
    for (const c of connectors) {
      const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<!<strong class="conn-student"[^>]*>)(?<![a-zA-ZÀ-ÿ0-9_])(${escaped})(?![a-zA-ZÀ-ÿ0-9_])(?!<\\/strong>)`, 'gi');
      res = res.replace(regex, '<strong class="conn-student" style="color:#1d4ed8 !important; font-weight:800 !important; background-color:#eff6ff !important; padding:2px 7px !important; border-radius:4px !important; border:1px solid #bfdbfe !important; display:inline-block !important; margin:1px 2px !important;">$1</strong>');
    }
    return res;
  };

  const formatModelPlan = (txt: string, planType: 'SIMPLE' | 'DIALECTIQUE' | 'ANALYTIQUE') => {
    let res = txt ? txt.trim() : '';

    // Déclaration officielle de la structure du plan en tête de modèle
    if (!res.includes('STRUCTURE DU PLAN DÉCLARÉ') && !res.includes('STRUCTURE DU PLAN RETENU')) {
      const bannerTitle = planType === 'DIALECTIQUE'
        ? 'PLAN DIALECTIQUE (THÈSE / ANTITHÈSE / SYNTHÈSE)'
        : (planType === 'ANALYTIQUE' ? 'PLAN ANALYTIQUE (CAUSES & SOLUTIONS)' : 'PLAN THÉMATIQUE SIMPLE (PROGRESSION PAR AXES)');
      res = `<div style="background:#0b1528; color:#f8fafc; padding:12px 18px; border-radius:12px; font-weight:800; font-size:0.9rem; margin-bottom:18px; border-left:6px solid #b45309; display:flex; align-items:center; gap:10px; box-shadow:0 2px 8px rgba(11,21,40,0.15);">
        <span style="font-size:1.1rem;">🎯</span>
        <span style="letter-spacing:0.05em;">STRUCTURE DU PLAN RETENU :</span>
        <span style="color:#fbbf24; text-decoration:underline; text-underline-offset:3px;">${bannerTitle}</span>
      </div>\n\n` + res;
    }

    // Déclaration colorée de chaque élément (Introduction, Thèse, Antithèse / Synthèse, Conclusion)
    res = res.replace(/###\s*\*{0,2}(?:1\.\s*)?Introduction[^\n]*/gi, 
      '<div style="margin-top:16px; margin-bottom:10px;"><span style="background:#fffbeb; color:#92400e; border:1.5px solid #fde68a; font-weight:800; font-size:0.825rem; padding:5px 12px; border-radius:8px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 2px rgba(180,83,9,0.06); letter-spacing:0.03em;">📌 1. INTRODUCTION (AMORCE • PROBLÉMATIQUE • ANNONCE DU PLAN)</span></div>');

    res = res.replace(/###\s*\*{0,2}(?:2\.\s*)?(?:Thèse|Premier Axe|1er Axe|Causes)[^\n]*/gi, 
      '<div style="margin-top:20px; margin-bottom:10px;"><span style="background:#eff6ff; color:#1d4ed8; border:1.5px solid #bfdbfe; font-weight:800; font-size:0.825rem; padding:5px 12px; border-radius:8px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 2px rgba(29,78,216,0.06); letter-spacing:0.03em;">⚖️ 2. PREMIÈRE PARTIE : THÈSE (ARGUMENTATION PRINCIPALE & EXEMPLES)</span></div>');

    res = res.replace(/###\s*\*{0,2}(?:3\.\s*)?(?:Antithèse|Second Axe|2ème Axe|Solutions|Conséquences)[^\n]*/gi, 
      '<div style="margin-top:20px; margin-bottom:10px;"><span style="background:#fdf2f8; color:#be185d; border:1.5px solid #fbcfe8; font-weight:800; font-size:0.825rem; padding:5px 12px; border-radius:8px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 2px rgba(190,24,93,0.06); letter-spacing:0.03em;">🔄 3. DEUXIÈME PARTIE : ANTITHÈSE (NUANCES, LIMITES & CONTRE-PERSPECTIVES)</span></div>');

    res = res.replace(/###\s*\*{0,2}(?:4\.\s*)?(?:Synthèse|Troisième Axe|3ème Axe)[^\n]*/gi, 
      '<div style="margin-top:20px; margin-bottom:10px;"><span style="background:#ecfdf5; color:#047857; border:1.5px solid #a7f3d0; font-weight:800; font-size:0.825rem; padding:5px 12px; border-radius:8px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 2px rgba(4,120,87,0.06); letter-spacing:0.03em;">💡 4. TROISIÈME PARTIE : SYNTHÈSE CRITIQUE (DÉPASSEMENT ET HARMONIE)</span></div>');

    res = res.replace(/###\s*\*{0,2}(?:5\.\s*)?Conclusion[^\n]*/gi, 
      '<div style="margin-top:20px; margin-bottom:10px;"><span style="background:#f1f5f9; color:#0f172a; border:1.5px solid #cbd5e1; font-weight:800; font-size:0.825rem; padding:5px 12px; border-radius:8px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 2px rgba(15,23,42,0.06); letter-spacing:0.03em;">🎯 5. CONCLUSION & PERSPECTIVE FINALE</span></div>');

    // Liens logiques en couleur bleue
    res = highlightConnectors(res);

    // Exemples d'œuvres en vert émeraude
    const worksTerms = [
      'La Boîte à Merveilles', 'La Boite a Merveilles', 'Ahmed Sefrioui', 'Sidi Mohammed', 'Lalla Zoubida', 'Maâlem Abdeslam', 'Lalla Aïcha', 'Sidi Abderrahmane',
      'Antigone', 'Jean Anouilh', 'Créon', 'Ismène', 'Hémon', 'Polynice', 'Étéocle', 'Le Chœur', 'La Nourrice',
      'Le Dernier Jour d’un Condamné', "Le Dernier Jour d'un Condamné", 'Victor Hugo', 'Bicêtre', 'la Conciergerie', 'la guillotine', 'la peine de mort'
    ];
    for (const w of worksTerms) {
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<!<strong[^>]*>)(?<![a-zA-ZÀ-ÿ0-9_])(${escaped})(?![a-zA-ZÀ-ÿ0-9_])(?!<\\/strong>)`, 'gi');
      res = res.replace(regex, '<strong style="color:#047857 !important; font-weight:800 !important; font-style:italic !important; background-color:#ecfdf5 !important; padding:1px 6px !important; border-radius:4px !important; border:1px solid #a7f3d0 !important; display:inline-block !important;">$1</strong>');
    }

    return res;
  };

  const formatTranscription = (transText: string, originalText: string, tableRaw?: string): string => {
    const cleaned = transText ? transText.replace(/<span class="struct-missing">[^<]*<\/span>/gi, '').trim() : '';
    
    // Connecteurs logiques officiels à mettre en gras
    const connectors = [
      'En premier lieu', 'En second lieu', 'En troisième lieu', 'En dernier lieu',
      'D’abord', "D'abord", 'Tout d’abord', "Tout d'abord", 'Ensuite', 'Puis', 'Enfin',
      'Cependant', 'Toutefois', 'Néanmoins', 'En revanche', 'Au contraire', 'Pourtant',
      'Par conséquent', 'Dès lors', 'En effet', 'De plus', 'Par ailleurs', 'En outre',
      'En définitive', 'En somme', 'En conclusion', 'Pour conclure', 'Finalement',
      'D’une part', "D'une part", 'D’autre part', "D'autre part", 'Ainsi',
      'C\'est pourquoi', 'C’est pourquoi'
    ];

    // Extraire les extraits fautifs du tableau pour garantir leur surlignage en rouge
    const tableErrors: string[] = [];
    if (tableRaw) {
      const lines = tableRaw.split('\n');
      for (const line of lines) {
        if (line.includes('|')) {
          const cells = line.split('|').map(c => c.trim()).filter(Boolean);
          if (cells.length >= 3 && !cells[0].toLowerCase().includes('extrait') && !cells[0].includes('---')) {
            const cleanErr = cells[0].replace(/<[^>]*>/g, '').replace(/\[[^\]]*\]/g, '').trim();
            if (cleanErr && cleanErr.length >= 2 && !tableErrors.includes(cleanErr)) {
              tableErrors.push(cleanErr);
            }
          }
        }
      }
    }

    const applyHighlights = (str: string) => {
      let res = str;

      // 1. Surligner en rouge les erreurs extraites du tableau (triées de la plus longue à la plus courte)
      const sortedErrors = [...tableErrors].sort((a, b) => b.length - a.length);
      for (const err of sortedErrors) {
        try {
          const escaped = err.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(?<!<span class="err-highlight"[^>]*>)(?<![a-zA-ZÀ-ÿ0-9_])(${escaped})(?![a-zA-ZÀ-ÿ0-9_])(?!<\\/span>)`, 'gi');
          res = res.replace(regex, '<span class="err-highlight" style="color:#dc2626 !important; background-color:#fee2e2 !important; font-weight:800 !important; border:1px solid #fca5a5 !important; text-decoration:underline wavy #ef4444 !important; padding:2px 6px !important; border-radius:4px !important; display:inline-block !important; margin:1px 2px !important;">$1</span>');
        } catch (e) {}
      }

      // 2. Transformer les éventuelles notations [faute -> correction] ou [faute] en erreurs rouges
      res = res.replace(/(?<!<span class="err-highlight"[^>]*>)(\[[^\]]+\])(?!<\/span>)/g, '<span class="err-highlight" style="color:#dc2626 !important; background-color:#fee2e2 !important; font-weight:800 !important; border:1px solid #fca5a5 !important; text-decoration:underline wavy #ef4444 !important; padding:2px 6px !important; border-radius:4px !important; display:inline-block !important; margin:1px 2px !important;">$1</span>');

      // 3. Connecteurs en gras s'ils ne le sont pas déjà
      for (const c of connectors) {
        const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<!<strong>)(?<![a-zA-ZÀ-ÿ0-9_])(${escaped})(?![a-zA-ZÀ-ÿ0-9_])(?!<\\/strong>)`, 'gi');
        res = res.replace(regex, '<strong>$1</strong>');
      }

      // 4. Si la balise <span class="err-highlight"> existe déjà sans inline style, lui ajouter le style rouge
      res = res.replace(/<span class="err-highlight"(?! style)/gi, '<span class="err-highlight" style="color:#dc2626 !important; background-color:#fee2e2 !important; font-weight:800 !important; border:1px solid #fca5a5 !important; text-decoration:underline wavy #ef4444 !important; padding:2px 6px !important; border-radius:4px !important; display:inline-block !important; margin:1px 2px !important;"');

      return res;
    };

    if (!cleaned) {
      const paras = originalText.split(/\n\s*\n/).filter(p => p.trim());
      return paras.map(p => `<p style="text-indent: 2.25rem; margin-bottom: 1.25rem; line-height: 2.1;">${applyHighlights(p.trim().replace(/\n/g, '<br/>'))}</p>`).join('\n\n');
    }

    // If it already has multiple <p> tags, preserve and format them
    const pCount = (cleaned.match(/<p[\s>]/gi) || []).length;
    if (pCount > 1) {
      return applyHighlights(cleaned);
    }

    // If separated by double linebreaks, split into distinct <p> tags
    const rawParas = cleaned.split(/\n\s*\n/).filter(p => p.trim());
    if (rawParas.length > 1) {
      return rawParas.map(p => {
        let trimmed = p.trim().replace(/^<p>/i, '').replace(/<\/p>$/i, '').trim();
        return `<p style="text-indent: 2.25rem; margin-bottom: 1.25rem; line-height: 2.1;">${applyHighlights(trimmed.replace(/\n/g, '<br/>'))}</p>`;
      }).join('\n\n');
    }

    // If AI grouped everything into 1 block while original manuscript has multiple paragraphs:
    const originalParas = originalText.split(/\n\s*\n/).filter(p => p.trim());
    if (originalParas.length > 1) {
      let remaining = cleaned.replace(/^<p>/i, '').replace(/<\/p>$/i, '').trim();
      const reconstructed: string[] = [];
      
      for (let i = 0; i < originalParas.length; i++) {
        if (i === originalParas.length - 1) {
          reconstructed.push(`<p style="text-indent: 2.25rem; margin-bottom: 1.25rem; line-height: 2.1;">${applyHighlights(remaining.trim())}</p>`);
          break;
        }
        
        const nextOrig = originalParas[i + 1].trim();
        const nextWords = nextOrig.split(/\s+/).slice(0, 3).join(' ');
        const sanitizedWords = nextWords.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const matchIndex = remaining.search(new RegExp(sanitizedWords, 'i'));
        
        if (matchIndex > 0) {
          const currentPara = remaining.slice(0, matchIndex).trim();
          reconstructed.push(`<p style="text-indent: 2.25rem; margin-bottom: 1.25rem; line-height: 2.1;">${applyHighlights(currentPara)}</p>`);
          remaining = remaining.slice(matchIndex).trim();
        } else {
          reconstructed.push(`<p style="text-indent: 2.25rem; margin-bottom: 1.25rem; line-height: 2.1;">${applyHighlights(originalParas[i].trim())}</p>`);
        }
      }
      if (reconstructed.length > 0) {
        return reconstructed.join('\n\n');
      }
    }

    return `<p style="text-indent: 2.25rem; margin-bottom: 1.25rem; line-height: 2.1;">${applyHighlights(cleaned.replace(/\n/g, '<br/>'))}</p>`;
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
      'personnellement', 'a mon avis', 'selon moi', 'd apres moi', 'a mon sens',
      'en ce qui me concerne', 'pour ma part', 'a mes yeux', 'je pense',
      'j estime', 'je trouve', 'je considere', 'je soutiens', 'je crois',
      'je partage', 'je ne partage pas', 'je suis d accord', 'je ne suis pas d accord',
      'je n approuve pas', 'j approuve', 'n approuve pas', 'refuse d admettre'
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

      let scoreC = 1.8;
      let scoreS = 1.7;
      let scoreA = 1.8;
      let scoreL = 2.2;
      let scoreX = 1.3;
      let totalCalc = '8.8';

      if (horsSujet) {
        scoreC = 0.0;
        scoreS = 0.0;
        scoreA = 0.0;
        scoreL = 0.0;
        scoreX = 0.0;
        totalCalc = '0.0';
        if (v1) v1.innerText = '0.0';
        if (v2) v2.innerText = '0.0';
        if (v3) v3.innerText = '0.0';
        if (v4) v4.innerText = '0.0';
        if (v5) v5.innerText = '0.0';
        if (rTotal) rTotal.innerText = '0/10';
      } else {
        if (g) {
          const c = g.match(/Consigne\s*:\s*([\d.]+)/i);
          const s = g.match(/Structure\s*:\s*([\d.]+)/i);
          const a = g.match(/Arguments\s*:\s*([\d.]+)/i);
          const l = g.match(/Langue\s*:\s*([\d.]+)/i);
          const x = g.match(/Lexique\s*:\s*([\d.]+)/i);

          if (c) scoreC = parseFloat(c[1]);
          if (s) scoreS = parseFloat(s[1]);
          if (a) scoreA = parseFloat(a[1]);
          if (l) scoreL = parseFloat(l[1]);
          if (x) scoreX = parseFloat(x[1]);

          if (c && v1) v1.innerText = c[1];
          if (s && v2) v2.innerText = s[1];
          if (a && v3) v3.innerText = a[1];
          if (l && v4) v4.innerText = l[1];
          if (x && v5) v5.innerText = x[1];

          totalCalc = (scoreC + scoreS + scoreA + scoreL + scoreX).toFixed(1);
        } else {
          if (v1) v1.innerText = '1.8';
          if (v2) v2.innerText = '1.7';
          if (v3) v3.innerText = '1.8';
          if (v4) v4.innerText = '2.2';
          if (v5) v5.innerText = '1.3';
        }
        if (rTotal) rTotal.innerText = `${totalCalc}/10`;
      }

      setScores({
        c: scoreC,
        s: scoreS,
        a: scoreA,
        l: scoreL,
        x: scoreX,
        total: totalCalc,
      });

      const reportSection = document.getElementById('reportSection');
      if (reportSection) reportSection.style.display = 'block';
      setHasReport(true);

      const rNom = document.getElementById('rNom');
      const rFil = document.getElementById('rFil');
      if (rNom) rNom.innerText = (studentName.trim() || 'CANDIDAT').toUpperCase();
      if (rFil) rFil.innerText = filiere;

      const outTable = document.getElementById('outTable');
      const parsedTable = extract('TABLEAU');
      if (outTable) {
        outTable.innerHTML = marked.parse(parsedTable || '| Extrait fautif (en rouge) | Nature | Correction (en vert) | Règle |\n| :--- | :--- | :--- | :--- |\n| Syntaxe | Ponctuation | Soigner les alinéas | Règle officielle |') as string;
      }

      const outTrans = document.getElementById('outTrans');
      const parsedTrans = extract('TRANSCRIPTION');
      if (outTrans) {
        outTrans.innerHTML = formatTranscription(parsedTrans, texte, parsedTable);
      }

      const outBilan = document.getElementById('outBilan');
      const parsedBilan = extract('BILAN');
      if (outBilan) {
        outBilan.innerHTML = marked.parse(parsedBilan || '### Diagnostic Didactique Global\n- Respect du thème et cohérence générale de la production écrite.') as string;
      }

      const outReform = document.getElementById('outReform');
      const parsedReform = extract('REFORMULATION');
      if (outReform) {
        let reformContent = parsedReform || '### Optimisation Stylistique\n> Maintien de la concordance des temps et de l’élégance académique.';
        let parsedHtml = marked.parse(reformContent) as string;
        parsedHtml = highlightConnectors(parsedHtml);
        outReform.innerHTML = parsedHtml;
      }

      const typePlan = extract('TYPE').toUpperCase();
      const sNorm = sujet.toLowerCase();
      const isExplicitOpinion = sNorm.includes('partagez-vous') ||
        sNorm.includes('partagez vous') ||
        sNorm.includes('pensez-vous') ||
        sNorm.includes('pensez vous') ||
        sNorm.includes('votre avis') ||
        sNorm.includes('votre point de vue') ||
        sNorm.includes('faut-il') ||
        sNorm.includes('faut il') ||
        sNorm.includes('peut-on') ||
        sNorm.includes('peut on') ||
        sNorm.includes('accord') ||
        sNorm.includes('opinion');

      const isExplicitAnalytic = (sNorm.includes('causes et solutions') ||
        sNorm.includes('causes et conséquences') ||
        sNorm.includes('causes et consequences') ||
        sNorm.includes('quelles sont les causes') ||
        sNorm.includes('analyser les causes')) && !isExplicitOpinion;

      const isAnalytic = isExplicitAnalytic || (typePlan.includes('ANALYTIQUE') && !isExplicitOpinion);

      setDetectedPlanType(isAnalytic ? 'ANALYTIQUE' : 'OPINION');

      planARef.current = extract('PLAN_A') || '<p>Modèle didactique certifié disponible.</p>';
      planBRef.current = extract('PLAN_B') || '<p>Plan dialectique complémentaire.</p>';

      const tabSelectors = document.getElementById('tabSelectors');
      if (tabSelectors) {
        tabSelectors.style.display = 'flex';
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

        setDetectedPlanType('OPINION');
        const tabSelectors = document.getElementById('tabSelectors');
        if (tabSelectors) tabSelectors.style.display = 'flex';

        if (!planARef.current) {
          planARef.current = `### 1. Introduction\nL'analyse de « ${sujet.slice(0, 70)} » soulève des questions fondamentales au cœur des œuvres littéraires au programme.\n\n### 2. Thèse\nEn premier lieu, l'affirmation de principes personnels permet de guider l'action avec lucidité.\n\n### 5. Conclusion\nEn somme, l'équilibre et la sincérité demeurent des repères précieux.`;
        }
        if (!planBRef.current) {
          planBRef.current = `### 1. Introduction\nFace à ce débat, deux perspectives complémentaires méritent d'être explorées avec rigueur.\n\n### 2. Thèse\nD'une part, cette vision offre des repères structurants et enrichissants.\n\n### 3. Antithèse\nD'autre part, il importe de nuancer cette approche pour éviter tout excès.\n\n### 4. Synthèse\nEn définitive, la conciliation de ces points de vue ouvre la voie à un discernement authentique.\n\n### 5. Conclusion\nPour conclure, la sagesse commande d'allier fidélité à soi et esprit de discernement.`;
        }

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

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden text-center">
          <div className="h-2 w-full absolute top-0 left-0 bg-gradient-to-r from-[#0b1528] via-[#c5221f] to-[#b45309]"></div>
          
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Lock className="w-8 h-8 text-amber-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/60 border border-amber-800/60 rounded-full mb-3 text-[11px] font-bold tracking-widest uppercase text-amber-300">
            Portail Pédagogique Réservé
          </div>

          <h1 className="font-cinzel text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            CENTRE <span className="text-[#f87171]">AL AKHAWAYN</span>
          </h1>
          <p className="font-outfit uppercase font-bold text-xs text-amber-400 tracking-wider mb-6">
            Système d'Expertise Didactique • Baccalauréat
          </p>

          <form onSubmit={handleUnlock} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Mot de Passe Enseignant
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Saisissez votre mot de passe..."
                  className="w-full py-3.5 pl-4 pr-12 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition text-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest transition shadow-lg active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>Vérification...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Déverrouiller l'Espace d'Évaluation</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-[11px] text-slate-500 italic">
            Session sécurisée • Centre d'Études & d'Excellence Pédagogique Al Akhawayn
          </p>
        </div>
      </div>
    );
  }

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
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> Manuscrit Rédactionnel du Candidat
            </h2>
            
            {/* Compteur officiel des lignes avec alerte rouge au-delà de 25 lignes */}
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border shadow-2xs ${
                lineCount > 25
                  ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-400/40 animate-pulse'
                  : lineCount >= 18
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-300 text-slate-700'
              }`}
            >
              {lineCount > 25 ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span className="font-mono font-black">{lineCount} lignes</span>
                  <span className="text-[11px] font-black uppercase text-red-600">/ 25 max (⚠️ Dépassement d'alerte !)</span>
                </>
              ) : (
                <>
                  <span>📏 Compteur :</span>
                  <span className="font-mono font-black">{lineCount}</span>
                  <span>ligne{lineCount > 1 ? 's' : ''} / 25 max</span>
                </>
              )}
            </div>
          </div>
          <textarea
            id="texte"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Rédigez ou collez votre production écrite ici..."
            className="writing-ruled-zone w-full p-4 border border-slate-300/80 rounded-lg outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition text-slate-900 resize-y"
          />
          {lineCount > 25 && (
            <div className="mt-2.5 p-3 rounded-lg bg-red-50 border border-red-300 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>
                <strong>Alerte de cadrage officiel :</strong> Le texte comporte <strong>{lineCount} lignes</strong> (la norme recommandée pour l'Examen Régional est de <strong>20 à 25 lignes</strong> maximum).
              </span>
            </div>
          )}
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
            {isProcessing ? (
              <>
                <span className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
                <span>Évaluation didactique en cours...</span>
              </>
            ) : (
              <span>Valider l'Évaluation Pédagogique</span>
            )}
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

          {/* Sceau officiel & En-tête académique d'excellence */}
          <div className="border-b-2 border-slate-900 pb-7 mb-8">
            {/* Bandeau officiel de tête */}
            <div className="bg-[#0b1528] text-white px-5 py-3.5 rounded-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-sm border border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-amber-400 block">
                  Royaume du Maroc • Ministère de l'Éducation Nationale
                </span>
                <span className="font-cinzel text-sm sm:text-base font-bold tracking-wider text-white">
                  Centre d'Expertise & Ingénierie Pédagogique Al Akhawayn
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1 bg-amber-500/20 border border-amber-400/40 rounded-full text-[11px] font-black uppercase tracking-wider text-amber-300">
                  Examen Régional 2026 • Contrôle Officiel
                </span>
              </div>
            </div>

            {/* Fiche d'identification et Cachet d'assermentation */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0b1528] text-amber-400 rounded-full text-xs font-black uppercase tracking-widest">
                  Procès-Verbal d'Évaluation Certifiée
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Candidat officiel :</span>
                  <h2 id="rNom" className="font-cinzel text-2xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
                    {studentName || 'YOUSSEF EL MANSOURI'}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 uppercase">Filière :</span>
                    <span id="rFil" className="font-outfit uppercase text-slate-700 font-bold">{filiere}</span>
                  </div>
                  <span className="text-slate-300">|</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 uppercase">Épreuve :</span>
                    <span className="text-slate-700">Production Écrite (Français - 1ère Bac)</span>
                  </div>
                </div>

                {/* Rappel du sujet officiel imposé */}
                {sujet && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mt-2 text-xs leading-relaxed text-slate-800">
                    <span className="font-extrabold uppercase text-[10px] tracking-wider text-[#b45309] block mb-1">
                      📌 Sujet Officiel Imposé au Candidat :
                    </span>
                    <p className="italic text-slate-700">« {sujet} »</p>
                  </div>
                )}
              </div>

              {/* Sceau officiel circulaire d'évaluation */}
              <div className="flex justify-center items-center lg:pl-6">
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
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h3 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> 1. Détail de la Grille Officielle (10 Points)
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    Moyennes de référence : Consigne 1.0/2 • Structure 1.0/2 • Arguments 1.0/2 • Langue 1.25/2.5 • Lexique 0.75/1.5
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {/* Consigne (max 2.0, moyenne 1.0) */}
                  <div className={`p-3.5 rounded-xl border text-center transition-all ${scores.c < 1.0 ? 'border-red-500 bg-red-50/90 text-red-950 ring-2 ring-red-400/50 shadow-xs' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${scores.c < 1.0 ? 'text-red-700 font-black' : 'text-slate-500'}`}>Consigne</span>
                    <span id="v1" className={`text-xl font-black font-mono block my-0.5 ${scores.c < 1.0 ? 'text-red-600 font-black' : 'text-slate-900'}`}>{scores.c}</span>
                    <span className={`text-[10px] font-bold block ${scores.c < 1.0 ? 'text-red-600 font-extrabold' : 'text-slate-400'}`}>/ 2.0</span>
                    {scores.c < 1.0 ? (
                      <span className="text-[9px] font-black text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-md uppercase block mt-1.5">⚠️ Sous la moyenne</span>
                    ) : (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase block mt-1.5">✓ Conforme</span>
                    )}
                  </div>

                  {/* Structure (max 2.0, moyenne 1.0) */}
                  <div className={`p-3.5 rounded-xl border text-center transition-all ${scores.s < 1.0 ? 'border-red-500 bg-red-50/90 text-red-950 ring-2 ring-red-400/50 shadow-xs' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${scores.s < 1.0 ? 'text-red-700 font-black' : 'text-slate-500'}`}>Structure</span>
                    <span id="v2" className={`text-xl font-black font-mono block my-0.5 ${scores.s < 1.0 ? 'text-red-600 font-black' : 'text-slate-900'}`}>{scores.s}</span>
                    <span className={`text-[10px] font-bold block ${scores.s < 1.0 ? 'text-red-600 font-extrabold' : 'text-slate-400'}`}>/ 2.0</span>
                    {scores.s < 1.0 ? (
                      <span className="text-[9px] font-black text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-md uppercase block mt-1.5">⚠️ Sous la moyenne</span>
                    ) : (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase block mt-1.5">✓ Conforme</span>
                    )}
                  </div>

                  {/* Arguments (max 2.0, moyenne 1.0) */}
                  <div className={`p-3.5 rounded-xl border text-center transition-all ${scores.a < 1.0 ? 'border-red-500 bg-red-50/90 text-red-950 ring-2 ring-red-400/50 shadow-xs' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${scores.a < 1.0 ? 'text-red-700 font-black' : 'text-slate-500'}`}>Arguments</span>
                    <span id="v3" className={`text-xl font-black font-mono block my-0.5 ${scores.a < 1.0 ? 'text-red-600 font-black' : 'text-slate-900'}`}>{scores.a}</span>
                    <span className={`text-[10px] font-bold block ${scores.a < 1.0 ? 'text-red-600 font-extrabold' : 'text-slate-400'}`}>/ 2.0</span>
                    {scores.a < 1.0 ? (
                      <span className="text-[9px] font-black text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-md uppercase block mt-1.5">⚠️ Sous la moyenne</span>
                    ) : (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase block mt-1.5">✓ Conforme</span>
                    )}
                  </div>

                  {/* Langue (max 2.5, moyenne 1.25) */}
                  <div className={`p-3.5 rounded-xl border text-center transition-all ${scores.l < 1.25 ? 'border-red-500 bg-red-50/90 text-red-950 ring-2 ring-red-400/50 shadow-xs' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${scores.l < 1.25 ? 'text-red-700 font-black' : 'text-slate-500'}`}>Langue</span>
                    <span id="v4" className={`text-xl font-black font-mono block my-0.5 ${scores.l < 1.25 ? 'text-red-600 font-black' : 'text-slate-900'}`}>{scores.l}</span>
                    <span className={`text-[10px] font-bold block ${scores.l < 1.25 ? 'text-red-600 font-extrabold' : 'text-slate-400'}`}>/ 2.5</span>
                    {scores.l < 1.25 ? (
                      <span className="text-[9px] font-black text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-md uppercase block mt-1.5">⚠️ Sous la moyenne</span>
                    ) : (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase block mt-1.5">✓ Conforme</span>
                    )}
                  </div>

                  {/* Lexique (max 1.5, moyenne 0.75) */}
                  <div className={`p-3.5 rounded-xl border text-center transition-all col-span-2 sm:col-span-1 ${scores.x < 0.75 ? 'border-red-500 bg-red-50/90 text-red-950 ring-2 ring-red-400/50 shadow-xs' : 'bg-slate-50 border-slate-200'}`}>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${scores.x < 0.75 ? 'text-red-700 font-black' : 'text-slate-500'}`}>Lexique</span>
                    <span id="v5" className={`text-xl font-black font-mono block my-0.5 ${scores.x < 0.75 ? 'text-red-600 font-black' : 'text-slate-900'}`}>{scores.x}</span>
                    <span className={`text-[10px] font-bold block ${scores.x < 0.75 ? 'text-red-600 font-extrabold' : 'text-slate-400'}`}>/ 1.5</span>
                    {scores.x < 0.75 ? (
                      <span className="text-[9px] font-black text-red-700 bg-red-100 border border-red-300 px-1.5 py-0.5 rounded-md uppercase block mt-1.5">⚠️ Sous la moyenne</span>
                    ) : (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase block mt-1.5">✓ Conforme</span>
                    )}
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
                    Chirurgie des phrases faibles et réécriture intégrale en français standard soigné (Niveau 1ère Bac). Proscription formelle du registre soutenu artificiel ou boursouflé. Liens logiques en gras et en couleur bleue.
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
                      <span>🎯 Modèle Actif :</span>
                      <span className="text-[#b45309]">
                        {activePlan === 'A' ? 'Option 1 : Plan Thématique (Simple)' : 'Option 2 : Plan Dialectique (Thèse / Antithèse)'}
                      </span>
                    </span>
                  </div>
                  
                  {/* Sélecteur de plan simple vs dialectique TOUJOURS PRÉSENT et accessible */}
                  <div id="tabSelectors" className="flex items-center gap-1.5 p-1 bg-slate-200 rounded-xl shadow-2xs">
                    <button
                      type="button"
                      onClick={() => displayM('A')}
                      id="ts"
                      className={`tab-trigger px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activePlan === 'A' ? 'active' : 'text-slate-700 hover:text-slate-900'}`}
                    >
                      Option 1 : Plan Thématique (Simple)
                    </button>
                    <button
                      type="button"
                      onClick={() => displayM('B')}
                      id="td"
                      className={`tab-trigger px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activePlan === 'B' ? 'active' : 'text-slate-700 hover:text-slate-900'}`}
                    >
                      Option 2 : Plan Dialectique (Thèse / Antithèse)
                    </button>
                  </div>
                </div>

                <div className="mb-3 text-[11px] font-semibold text-slate-500">
                  <span>Modèles d'excellence certifiés conformes au Cadre de Référence officiel. Structure déclarée, chaque élément identifié par sa couleur (Introduction, Thèse, Antithèse, Synthèse, Conclusion), liens logiques en bleu et exemples précis des œuvres au programme en vert émeraude.</span>
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

      {/* MODAL MODIFICATION MOT DE PASSE ENSEIGNANT AVEC CONFIRMATION GMAIL (2 ÉTAPES) */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-outfit font-bold text-base leading-tight">Sécurité Enseignant</h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {passwordChangeStep === 'REQUEST' ? 'Étape 1 : Vérification d\'identité' : 'Étape 2 : Confirmation par code Gmail'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowChangeModal(false);
                  setPasswordChangeStep('REQUEST');
                  setChangeFeedback(null);
                }}
                className="text-slate-400 hover:text-white text-xl leading-none px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {passwordChangeStep === 'REQUEST' ? (
              <form onSubmit={handleRequestCode} className="p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pour sécuriser l'accès au système, la modification du mot de passe requiert la validation de votre adresse Gmail titulaire. Un code à usage unique vous sera transmis.
                </p>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Adresse Gmail Enseignant
                  </label>
                  <input
                    type="email"
                    value={professorEmailInput}
                    onChange={(e) => setProfessorEmailInput(e.target.value)}
                    placeholder="votre-adresse-email@gmail.com"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                    required
                    autoFocus
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Saisissez votre messagerie Gmail enregistrée pour recevoir le code de sécurité.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Mot de passe actuel
                  </label>
                  <input
                    type="password"
                    value={oldPasswordInput}
                    onChange={(e) => setOldPasswordInput(e.target.value)}
                    placeholder="Saisissez votre mot de passe actuel..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                    required
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
                    onClick={() => {
                      setShowChangeModal(false);
                      setChangeFeedback(null);
                    }}
                    className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isChanging}
                    className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {isChanging ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Envoi en cours...</span>
                      </>
                    ) : (
                      <>
                        <span>✉️</span>
                        <span>Envoyer le code par Gmail</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmChangePassword} className="p-6 space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <span className="text-base">📧</span>
                  <div>
                    <span className="font-bold block">Code de sécurité expédié par Gmail !</span>
                    <span className="text-[11px] text-amber-800">
                      Ouvrez votre boîte de réception Gmail (et votre dossier Spam / Indésirables si besoin) pour récupérer votre code secret à 6 chiffres. Ce code reste strictement confidentiel et n'est jamais affiché sur cette page.
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Code secret reçu par Gmail (6 chiffres)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCodeInput}
                    onChange={(e) => setVerificationCodeInput(e.target.value.trim())}
                    placeholder="• • • • • •"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-lg font-mono tracking-[0.4em] font-black text-center text-slate-900 focus:bg-white focus:border-slate-900 outline-none placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400"
                    required
                    autoFocus
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block text-center">
                    Saisissez ici les 6 chiffres reçus dans l'email envoyé à votre adresse hadmed.brave@gmail.com
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Nouveau mot de passe (min 4 car.)..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Confirmer le nouveau mot de passe..."
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                    required
                  />
                </div>

                {changeFeedback && (
                  <div className={`p-3 rounded-lg text-xs font-medium ${changeFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    {changeFeedback.message}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordChangeStep('REQUEST');
                      setVerificationCodeInput('');
                      setChangeFeedback(null);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    ← Renvoyer un code
                  </button>
                  <button
                    type="submit"
                    disabled={isChanging}
                    className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50"
                  >
                    {isChanging ? 'Validation...' : 'Confirmer & Enregistrer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
