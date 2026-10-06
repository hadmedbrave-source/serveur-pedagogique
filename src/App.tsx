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

  // Authentification Enseignant & Candidat (mémorisée en continu dans le navigateur de l'élève)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      const auth = localStorage.getItem('akhawayn_auth');
      const pwd = localStorage.getItem('akhawayn_pwd');
      const sessAuth = sessionStorage.getItem('akhawayn_auth');
      // Si l'élève est déjà authentifié ou possède un mot de passe stocké dans le navigateur
      if (auth === 'true' || sessAuth === 'true' || (typeof pwd === 'string' && pwd.trim().length >= 4)) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  });
  const [sessionPassword, setSessionPassword] = useState(() => {
    try {
      return localStorage.getItem('akhawayn_pwd') || 'AKHAWAYN2026';
    } catch {
      return 'AKHAWAYN2026';
    }
  });
  const [passwordInput, setPasswordInput] = useState(() => {
    try {
      return localStorage.getItem('akhawayn_pwd') || '';
    } catch {
      return '';
    }
  });
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState<string | null>(null);
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

  // Modal Changement de mot de passe sécurisé par Clé Maître Enseignant
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [passwordChangeStep, setPasswordChangeStep] = useState<'KEY' | 'PASSWORDS'>('KEY');
  const [masterKeyInput, setMasterKeyInput] = useState('');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [changeFeedback, setChangeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isChanging, setIsChanging] = useState(false);

  // Modal Mot de passe Candidat (sert à introduire le mot de passe actuel)
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [candidatePasswordInput, setCandidatePasswordInput] = useState('');
  const [candidateFeedback, setCandidateFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isCheckingCandidate, setIsCheckingCandidate] = useState(false);
  const [showCandidatePassword, setShowCandidatePassword] = useState(false);

  // Utilitaires de stockage dans le navigateur de l'élève (localStorage)
  const getStoredArchives = (): { boite: any[]; antigone: any[]; condamne: any[] } => {
    try {
      const stored = localStorage.getItem('akhawayn_student_archives');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          boite: Array.isArray(parsed?.boite) ? parsed.boite : [],
          antigone: Array.isArray(parsed?.antigone) ? parsed.antigone : [],
          condamne: Array.isArray(parsed?.condamne) ? parsed.condamne : [],
        };
      }
    } catch (e) {
      console.error('Erreur lecture localStorage archives:', e);
    }
    return { boite: [], antigone: [], condamne: [] };
  };

  const mergeArchiveArrays = (localArr: any[], serverArr: any[]): any[] => {
    const map = new Map<string, any>();
    for (const item of localArr || []) {
      if (item && item.id) map.set(item.id, item);
    }
    for (const item of serverArr || []) {
      if (item && item.id && !map.has(item.id)) {
        map.set(item.id, item);
      }
    }
    return Array.from(map.values());
  };

  // Boîtes d'archives par œuvre (Enregistrées prioritairement dans le navigateur de l'élève)
  const [archives, setArchives] = useState<{ boite: any[]; antigone: any[]; condamne: any[] }>(getStoredArchives);
  const [selectedWorkBox, setSelectedWorkBox] = useState<'boite' | 'antigone' | 'condamne' | null>(null);
  const [viewingArchiveItem, setViewingArchiveItem] = useState<any | null>(null);
  const [archiveActiveTab, setArchiveActiveTab] = useState<'optimized' | 'model' | 'original'>('optimized');
  const [archiveModelPlanTab, setArchiveModelPlanTab] = useState<'A' | 'B'>('A');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const planARef = useRef('');
  const planBRef = useRef('');

  useEffect(() => {
    // Déverrouillage automatique et immédiat si l'élève a son mot de passe mémorisé dans son navigateur
    try {
      const auth = localStorage.getItem('akhawayn_auth');
      const pwd = localStorage.getItem('akhawayn_pwd');
      if (auth === 'true' || (pwd && pwd.trim().length >= 4)) {
        setIsUnlocked(true);
        sessionStorage.setItem('akhawayn_auth', 'true');
      }
    } catch (e) {
      console.warn('Erreur accès localStorage:', e);
    }

    fetchArchives();

    // Bloquer le clic droit sur toute la page
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const fetchArchives = async () => {
    // 1. Chargement instantané et garanti depuis le navigateur de l'élève
    const local = getStoredArchives();
    setArchives(local);

    // 2. Synchronisation de secours avec le serveur (sans écraser les copies de l'élève)
    try {
      const res = await fetch('/api/archives');
      if (res.ok) {
        const serverData = await res.json();
        if (serverData && typeof serverData === 'object') {
          const merged = {
            boite: mergeArchiveArrays(local.boite, serverData.boite || []),
            antigone: mergeArchiveArrays(local.antigone, serverData.antigone || []),
            condamne: mergeArchiveArrays(local.condamne, serverData.condamne || []),
          };
          setArchives(merged);
          try {
            localStorage.setItem('akhawayn_student_archives', JSON.stringify(merged));
          } catch {}
        }
      }
    } catch (e) {
      // Aucun problème : le navigateur conserve toutes les productions en local
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthNotice(null);
    if (!passwordInput.trim()) {
      setAuthError('Veuillez introduire le mot de passe actuel.');
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
        localStorage.setItem('akhawayn_auth', 'true');
        localStorage.setItem('akhawayn_pwd', passwordInput.trim());
        sessionStorage.setItem('akhawayn_auth', 'true');
        setPasswordInput('');
      } else {
        setAuthError(data.message || 'Mot de passe incorrect.');
      }
    } catch (err) {
      if (passwordInput.trim() === 'AKHAWAYN2026') {
        setSessionPassword(passwordInput.trim());
        setIsUnlocked(true);
        localStorage.setItem('akhawayn_auth', 'true');
        localStorage.setItem('akhawayn_pwd', passwordInput.trim());
        sessionStorage.setItem('akhawayn_auth', 'true');
        setPasswordInput('');
      } else {
        setAuthError('Mot de passe incorrect.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyCandidatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidatePasswordInput.trim()) {
      setCandidateFeedback({ type: 'error', message: 'Veuillez introduire le mot de passe actuel.' });
      return;
    }
    setIsCheckingCandidate(true);
    setCandidateFeedback(null);
    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: candidatePasswordInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessionPassword(candidatePasswordInput.trim());
        setIsUnlocked(true);
        localStorage.setItem('akhawayn_auth', 'true');
        localStorage.setItem('akhawayn_pwd', candidatePasswordInput.trim());
        sessionStorage.setItem('akhawayn_auth', 'true');
        setCandidateFeedback({ type: 'success', message: 'Mot de passe actuel validé avec succès ! Session candidat active et mémorisée dans votre navigateur.' });
        setTimeout(() => {
          setShowCandidateModal(false);
          setCandidatePasswordInput('');
          setCandidateFeedback(null);
        }, 1300);
      } else {
        setCandidateFeedback({ type: 'error', message: data.message || 'Mot de passe actuel incorrect.' });
      }
    } catch {
      if (candidatePasswordInput.trim() === 'AKHAWAYN2026') {
        setSessionPassword(candidatePasswordInput.trim());
        setIsUnlocked(true);
        localStorage.setItem('akhawayn_auth', 'true');
        localStorage.setItem('akhawayn_pwd', candidatePasswordInput.trim());
        sessionStorage.setItem('akhawayn_auth', 'true');
        setCandidateFeedback({ type: 'success', message: 'Mot de passe actuel validé avec succès ! Session candidat active et mémorisée dans votre navigateur.' });
        setTimeout(() => {
          setShowCandidateModal(false);
          setCandidatePasswordInput('');
          setCandidateFeedback(null);
        }, 1300);
      } else {
        setCandidateFeedback({ type: 'error', message: 'Mot de passe actuel incorrect.' });
      }
    } finally {
      setIsCheckingCandidate(false);
    }
  };

  const handleVerifyMasterKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeFeedback(null);

    const clean = masterKeyInput.trim();
    if (!clean) {
      setChangeFeedback({ type: 'error', message: 'Veuillez saisir votre clé secrète d’habilitation.' });
      return;
    }

    setIsChanging(true);
    try {
      const res = await fetch('/api/verify-master-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterKey: clean }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordChangeStep('PASSWORDS');
        setChangeFeedback({ type: 'success', message: 'Identité direction validée avec succès ! Vous pouvez maintenant mettre à jour le mot de passe.' });
      } else {
        setChangeFeedback({ type: 'error', message: data.message || 'Clé secrète d’habilitation incorrecte.' });
      }
    } catch (err) {
      setChangeFeedback({ type: 'error', message: 'Erreur de connexion au serveur.' });
    } finally {
      setIsChanging(false);
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeFeedback(null);

    if (!oldPasswordInput.trim() || !newPasswordInput.trim() || !confirmPasswordInput.trim()) {
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
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterKey: masterKeyInput.trim(),
          oldPassword: oldPasswordInput.trim(),
          newPassword: newPasswordInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChangeFeedback({
          type: 'success',
          message: 'Mot de passe mis à jour avec succès ! La page a été verrouillée automatiquement.',
        });
        setSessionPassword(newPasswordInput.trim());
        setOldPasswordInput('');
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        setMasterKeyInput('');

        // Verrouillage automatique de la session
        localStorage.removeItem('akhawayn_auth');
        sessionStorage.removeItem('akhawayn_auth');
        setIsUnlocked(false);
        setPasswordInput('');
        setAuthError('');
        setAuthNotice('Session verrouillée suite au changement de mot de passe. Le candidat doit introduire le nouveau mot de passe fourni par la direction.');

        setTimeout(() => {
          setShowChangeModal(false);
          setPasswordChangeStep('KEY');
          setChangeFeedback(null);
        }, 1500);
      } else {
        setChangeFeedback({ type: 'error', message: data.message || 'Mot de passe actuel incorrect.' });
      }
    } catch (err) {
      setChangeFeedback({ type: 'error', message: 'Erreur de connexion au serveur.' });
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
      outModel.innerHTML = formatted;
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
      'De surcroît', 'De surcroit',
      'En définitive', 'En somme', 'En conclusion', 'Pour conclure', 'Finalement',
      'D’une part', "D'une part", 'D’autre part', "D'autre part", 'Ainsi',
      'C\'est pourquoi', 'C’est pourquoi', 'Non seulement', 'Mais encore',
      'À cet égard', "A cet égard", 'Il en résulte que'
    ];
    let res = html;
    for (const c of connectors) {
      const escaped = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<!<strong class="conn-student"[^>]*>)(?<![a-zA-ZÀ-ÿ0-9_])(${escaped})(?![a-zA-ZÀ-ÿ0-9_])(?!<\\/strong>)`, 'gi');
      res = res.replace(regex, '<strong class="conn-student" style="color:#1d4ed8 !important; font-weight:800 !important; background-color:#eff6ff !important; padding:2px 7px !important; border-radius:4px !important; border:1px solid #bfdbfe !important; display:inline-block !important; margin:1px 2px !important;">$1</strong>');
    }
    return res;
  };

  const cleanTableMarkdown = (tableMd: string): string => {
    if (!tableMd) return tableMd;
    const lines = tableMd.split('\n');
    const filteredLines: string[] = [];
    for (const line of lines) {
      if (!line.includes('|')) {
        filteredLines.push(line);
        continue;
      }
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (line.includes('---') || cells[0]?.toLowerCase().includes('extrait')) {
        filteredLines.push(line);
        continue;
      }
      if (cells.length >= 3) {
        // Normaliser complètement en retirant balises HTML, crochets, guillemets, ponctuations et espaces superflus
        const normalizeText = (txt: string) => {
          return txt
            .replace(/<[^>]*>/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/[«»"'`*_\.,;:!?()—–\-\\/]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        };

        const cleanErr = normalizeText(cells[0]);
        const cleanCorr = cells[2] ? normalizeText(cells[2]) : '';
        const nature = cells[1] ? normalizeText(cells[1]) : '';

        // 1. Si l'extrait fautif et la correction certifiée sont identiques, fausse erreur : élimination stricte !
        if (cleanErr && cleanCorr && cleanErr === cleanCorr) {
          continue;
        }

        // 2. Si la colonne Nature dit qu'il n'y a pas d'erreur ou aucune faute : élimination !
        if (nature.includes('aucune') || nature.includes('pas d erreur') || nature.includes('correct') || nature.includes('sans faute')) {
          continue;
        }

        // 3. Si l'extrait comporte plus de 4 mots et qu'il n'y a aucune différence réelle avec la correction : élimination !
        const errWords = cleanErr.split(' ').filter(Boolean);
        const corrWords = cleanCorr.split(' ').filter(Boolean);
        if (errWords.length >= 5 && (cleanErr.includes(cleanCorr) || cleanCorr.includes(cleanErr))) {
          const diff = errWords.filter(w => !corrWords.includes(w)).length;
          if (diff === 0) {
            continue;
          }
        }

        // 4. Si l'extrait fautif est vide ou comporte un simple point d'interrogation ou tiret
        if (!cleanErr || cleanErr === '-' || cleanErr === '?') {
          continue;
        }

        filteredLines.push(line);
      }
    }
    return filteredLines.join('\n');
  };

  const formatReformulation = (rawMd: string): string => {
    if (!rawMd) return '';
    let parsed = marked.parse(rawMd) as string;
    parsed = parsed.replace(/&#39;/g, "'");

    // Remplacement et stylisation chromatique stricte des cartes de phrases de l'élève (Section 5.A)
    // Phrase 1 : Thème Indigo
    parsed = parsed.replace(/(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?1\s*:?<\/strong>([\s\S]*?)(?=(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?2|<h[1-4]>|<hr|$)/i, (m, content) => {
      let cleanContent = content.replace(/<\/li>$/, '').replace(/<ul>\s*<li>/g, '<div style="margin-top:10px;">').replace(/<\/li>\s*<li>/g, '</div><div style="margin-top:8px;">').replace(/<\/li>\s*<\/ul>/g, '</div>');
      return `<div class="phrase-card-indigo" style="background:#eef2ff !important; border:2px solid #818cf8 !important; border-left:6px solid #4f46e5 !important; border-radius:14px !important; padding:16px 20px !important; margin-bottom:18px !important; box-shadow:0 2px 6px rgba(79,70,229,0.08) !important;">
        <div style="margin-bottom:10px;"><span style="background:#4f46e5 !important; color:#ffffff !important; font-size:0.75rem !important; font-weight:900 !important; padding:4px 12px !important; border-radius:6px !important; display:inline-flex !important; align-items:center !important; gap:6px !important; letter-spacing:0.04em !important; box-shadow:0 1px 3px rgba(79,70,229,0.3) !important;">📌 1. PHRASE DE L’ÉLÈVE N°1 (INDIGO)</span></div>
        <div style="color:#1e293b;">${cleanContent}</div>
      </div>`;
    });

    // Phrase 2 : Thème Ambre / Orange
    parsed = parsed.replace(/(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?2\s*:?<\/strong>([\s\S]*?)(?=(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?3|<h[1-4]>|<hr|$)/i, (m, content) => {
      let cleanContent = content.replace(/<\/li>$/, '').replace(/<ul>\s*<li>/g, '<div style="margin-top:10px;">').replace(/<\/li>\s*<li>/g, '</div><div style="margin-top:8px;">').replace(/<\/li>\s*<\/ul>/g, '</div>');
      return `<div class="phrase-card-amber" style="background:#fffbeb !important; border:2px solid #fcd34d !important; border-left:6px solid #d97706 !important; border-radius:14px !important; padding:16px 20px !important; margin-bottom:18px !important; box-shadow:0 2px 6px rgba(217,119,6,0.08) !important;">
        <div style="margin-bottom:10px;"><span style="background:#d97706 !important; color:#ffffff !important; font-size:0.75rem !important; font-weight:900 !important; padding:4px 12px !important; border-radius:6px !important; display:inline-flex !important; align-items:center !important; gap:6px !important; letter-spacing:0.04em !important; box-shadow:0 1px 3px rgba(217,119,6,0.3) !important;">📌 2. PHRASE DE L’ÉLÈVE N°2 (AMBRE)</span></div>
        <div style="color:#1e293b;">${cleanContent}</div>
      </div>`;
    });

    // Phrase 3 : Thème Émeraude / Sarcelle
    parsed = parsed.replace(/(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?3\s*:?<\/strong>([\s\S]*?)(?=(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?4|<h[1-4]>|<hr|$)/i, (m, content) => {
      let cleanContent = content.replace(/<\/li>$/, '').replace(/<ul>\s*<li>/g, '<div style="margin-top:10px;">').replace(/<\/li>\s*<li>/g, '</div><div style="margin-top:8px;">').replace(/<\/li>\s*<\/ul>/g, '</div>');
      return `<div class="phrase-card-emerald" style="background:#ecfdf5 !important; border:2px solid #86efac !important; border-left:6px solid #059669 !important; border-radius:14px !important; padding:16px 20px !important; margin-bottom:18px !important; box-shadow:0 2px 6px rgba(5,150,105,0.08) !important;">
        <div style="margin-bottom:10px;"><span style="background:#059669 !important; color:#ffffff !important; font-size:0.75rem !important; font-weight:900 !important; padding:4px 12px !important; border-radius:6px !important; display:inline-flex !important; align-items:center !important; gap:6px !important; letter-spacing:0.04em !important; box-shadow:0 1px 3px rgba(5,150,105,0.3) !important;">📌 3. PHRASE DE L’ÉLÈVE N°3 (ÉMERAUDE)</span></div>
        <div style="color:#1e293b;">${cleanContent}</div>
      </div>`;
    });

    // Phrase 4 (si présente) : Thème Pourpre / Violet
    parsed = parsed.replace(/(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?4\s*:?<\/strong>([\s\S]*?)(?=<h[1-4]>|<hr|$)/i, (m, content) => {
      let cleanContent = content.replace(/<\/li>$/, '').replace(/<ul>\s*<li>/g, '<div style="margin-top:10px;">').replace(/<\/li>\s*<li>/g, '</div><div style="margin-top:8px;">').replace(/<\/li>\s*<\/ul>/g, '</div>');
      return `<div class="phrase-card-purple" style="background:#faf5ff !important; border:2px solid #d8b4fe !important; border-left:6px solid #9333ea !important; border-radius:14px !important; padding:16px 20px !important; margin-bottom:18px !important; box-shadow:0 2px 6px rgba(147,51,234,0.08) !important;">
        <div style="margin-bottom:10px;"><span style="background:#9333ea !important; color:#ffffff !important; font-size:0.75rem !important; font-weight:900 !important; padding:4px 12px !important; border-radius:6px !important; display:inline-flex !important; align-items:center !important; gap:6px !important; letter-spacing:0.04em !important; box-shadow:0 1px 3px rgba(147,51,234,0.3) !important;">📌 4. PHRASE DE L’ÉLÈVE N°4 (POURPRE)</span></div>
        <div style="color:#1e293b;">${cleanContent}</div>
      </div>`;
    });

    // Badges distincts pour Diagnostic didactique et Reformulation
    parsed = parsed.replace(/<strong>Diagnostic didactique\s*:?<\/strong>/gi, 
      '<span style="background:#f1f5f9; color:#334155; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:6px; border:1px solid #cbd5e1; display:inline-flex; align-items:center; gap:4px; margin-right:6px;">🔍 Diagnostic didactique :</span>');

    parsed = parsed.replace(/<strong>Reformulation claire et naturelle(?:\s*\([^)]*\))?\s*:?<\/strong>/gi, 
      '<span style="background:#ecfdf5; color:#047857; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:6px; border:1.5px solid #a7f3d0; display:inline-flex; align-items:center; gap:4px; margin-right:6px; box-shadow:0 1px 2px rgba(4,120,87,0.08);">✨ Reformulation certifiée (1ère Bac) :</span>');

    // Mise en page soignée pour Section B : Texte Intégral Réécrit & Fluidifié
    parsed = parsed.replace(/(<h[1-4]>.*?B\.\s*Texte\s+Intégral[\s\S]*?<\/h[1-4]>)([\s\S]*?)$/i, (m, hTag, content) => {
      return `
        <div style="margin-top:28px; background:#ffffff; border:2px solid #0b1528; border-radius:16px; padding:22px; box-shadow:0 4px 14px rgba(11,21,40,0.08);">
          <div style="background:#0b1528; border-radius:12px; padding:12px 18px; margin-bottom:18px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.15rem;">🏆</span>
              <span style="color:#ffffff; font-weight:900; font-size:0.85rem; letter-spacing:0.04em;">B. TEXTE INTÉGRAL RÉÉCRIT & FLUIDIFIÉ (VERSION CONTINUE D'EXCELLENCE)</span>
            </div>
            <span style="background:#059669; color:#ffffff; font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:9999px;">EXEMPLES DES ŒUVRES EN GRAS • CONNECTEURS EN BLEU</span>
          </div>
          <div style="color:#1e293b; line-height:2.05; text-align:justify; font-size:0.95rem;">
            ${content}
          </div>
        </div>
      `;
    });

    // Connecteurs en bleu
    parsed = highlightConnectors(parsed);

    // Convertir les balises markdown en gras si présentes
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // B. Texte Intégral Réécrit : Exemples tirés des œuvres EN GRAS BIEN VISIBLE
    const worksExamplesRegex = [
      /\b(La Bo[iî]te [aà] Merveilles)\b/gi,
      /\b(Ahmed Sefrioui)\b/gi,
      /\b(Sidi Mohammed)\b/gi,
      /\b(Lalla Zoubida)\b/gi,
      /\b(Ma[aâ]lem Abdeslam)\b/gi,
      /\b(Lalla A[iï]cha)\b/gi,
      /\b(Dar Chouafa)\b/gi,
      /\b(la voyante(?:\s+Kenza)?)\b/gi,
      /\b(Kenza)\b/gi,
      /\b(Zineb)\b/gi,
      /\b(Rahma)\b/gi,
      /\b(Fatma Bziouya)\b/gi,
      /\b(Sidi El Arafi)\b/gi,
      /\b(le fqih)\b/gi,
      /\b(le Msid)\b/gi,
      /\b(Moulay Larbi)\b/gi,
      /\b(Sidi Ali Boughaleb)\b/gi,
      /\b(Antigone)\b/gi,
      /\b(Jean Anouilh)\b/gi,
      /\b(Cr[eé]on)\b/gi,
      /\b(Ism[eè]ne)\b/gi,
      /\b(H[eé]mon)\b/gi,
      /\b(Polynice)\b/gi,
      /\b([EÉ]t[eé]ocle)\b/gi,
      /\b(Eurydice)\b/gi,
      /\b(Le Ch[oœ]ur)\b/gi,
      /\b(La Nourrice)\b/gi,
      /\b(Th[eè]bes)\b/gi,
      /\b(Le Dernier Jour d['’]un Condamn[eé])\b/gi,
      /\b(Victor Hugo)\b/gi,
      /\b(le condamn[eé](?:\s+[aà]\s+mort)?)\b/gi,
      /\b(la petite Marie)\b/gi,
      /\b(Bic[eê]tre)\b/gi,
      /\b(la Conciergerie)\b/gi,
      /\b(la guillotine)\b/gi,
      /\b(la peine de mort)\b/gi,
      /\b(la place de Gr[eè]ve)\b/gi,
      /\b(le friauche)\b/gi,
      /\b(le bourreau Samson)\b/gi,
    ];

    for (const reg of worksExamplesRegex) {
      parsed = parsed.replace(reg, '<strong class="work-example">$1</strong>');
    }

    return parsed;
  };

  const formatModelPlan = (txt: string, planType: 'SIMPLE' | 'DIALECTIQUE' | 'ANALYTIQUE') => {
    let raw = txt ? txt.trim() : '';
    // Conversion préalable des balises Markdown en HTML
    raw = raw.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const isDialectique = planType === 'DIALECTIQUE';
    const bannerTitle = isDialectique
      ? 'PLAN DIALECTIQUE (THÈSE / ANTITHÈSE / SYNTHÈSE)'
      : (planType === 'ANALYTIQUE' ? 'PLAN ANALYTIQUE (CAUSES & SOLUTIONS)' : 'PLAN THÉMATIQUE (PROGRESSION PAR AXES)');

    // 1. Structure du plan en haut avec jetons de couleur correspondants (Orange, Bleu, Violet, Sarcelle, Vert)
    const planHeaderHtml = `
      <div style="background:#0b1528; border-radius:14px; padding:16px 20px; margin-bottom:22px; border:1px solid #1e293b; box-shadow:0 4px 12px rgba(11,21,40,0.15);">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; margin-bottom:12px; border-bottom:1px solid #1e293b; padding-bottom:10px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.15rem;">🎯</span>
            <span style="font-weight:900; font-size:0.85rem; color:#ffffff; letter-spacing:0.06em; text-transform:uppercase;">STRUCTURE DU PLAN RETENU :</span>
            <span style="background:#b45309; color:#fef3c7; font-size:0.75rem; font-weight:800; padding:2px 10px; border-radius:9999px; text-transform:uppercase; letter-spacing:0.04em;">${bannerTitle}</span>
          </div>
          <span style="font-size:0.72rem; color:#94a3b8; font-weight:600;">(Correspondance chromatique directe avec les parties du texte ci-dessous)</span>
        </div>
        
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          <div style="background:#ea580c; color:#ffffff; font-weight:800; font-size:0.75rem; padding:5px 12px; border-radius:7px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(234,88,12,0.25);">
            <span>📌</span> 1. INTRODUCTION (ORANGE)
          </div>
          <div style="background:#2563eb; color:#ffffff; font-weight:800; font-size:0.75rem; padding:5px 12px; border-radius:7px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(37,99,235,0.25);">
            <span>⚖️</span> 2. AXE 1 / THÈSE (BLEU)
          </div>
          ${isDialectique ? `
          <div style="background:#9333ea; color:#ffffff; font-weight:800; font-size:0.75rem; padding:5px 12px; border-radius:7px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(147,51,234,0.25);">
            <span>🔄</span> 3. AXE 2 / ANTITHÈSE (VIOLET)
          </div>
          <div style="background:#0d9488; color:#ffffff; font-weight:800; font-size:0.75rem; padding:5px 12px; border-radius:7px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(13,148,136,0.25);">
            <span>💡</span> 4. SYNTHÈSE CRITIQUE (SARCELLE)
          </div>` : `
          <div style="background:#0d9488; color:#ffffff; font-weight:800; font-size:0.75rem; padding:5px 12px; border-radius:7px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(13,148,136,0.25);">
            <span>🔍</span> 3. SECOND AXE D'ANALYSE (SARCELLE)
          </div>`}
          <div style="background:#059669; color:#ffffff; font-weight:800; font-size:0.75rem; padding:5px 12px; border-radius:7px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(5,150,105,0.25);">
            <span>🎯</span> CONCLUSION (VERT ÉMERAUDE)
          </div>
        </div>
      </div>
    `;

    // Retirer d'anciens bandeaux si réinjectés
    raw = raw.replace(/<div style="background:#0b1528;[\s\S]*?<\/div>\s*<\/div>/gi, '').trim();

    // Découpage et identification des parties
    let introMatch = raw.match(/<div class="model-intro">([\s\S]*?)<\/div>/i);
    let axe1Match = raw.match(/<div class="model-axe1">([\s\S]*?)<\/div>/i) || raw.match(/<div class="model-these">([\s\S]*?)<\/div>/i);
    let axe2Match = raw.match(/<div class="model-axe2">([\s\S]*?)<\/div>/i) || raw.match(/<div class="model-antithese">([\s\S]*?)<\/div>/i);
    let axe3Match = raw.match(/<div class="model-axe3">([\s\S]*?)<\/div>/i) || raw.match(/<div class="model-synthese">([\s\S]*?)<\/div>/i);
    let conclMatch = raw.match(/<div class="model-concl">([\s\S]*?)<\/div>/i);

    let introContent = introMatch ? introMatch[1].trim() : '';
    let axe1Content = axe1Match ? axe1Match[1].trim() : '';
    let axe2Content = axe2Match ? axe2Match[1].trim() : '';
    let axe3Content = axe3Match ? axe3Match[1].trim() : '';
    let conclContent = conclMatch ? conclMatch[1].trim() : '';

    if (!axe1Content) {
      const bodyMatch = raw.match(/<div class="model-body">([\s\S]*?)<\/div>/i);
      if (bodyMatch) {
        const pParas = bodyMatch[1].split(/<\/p>\s*<p>/i);
        if (pParas.length >= 2) {
          axe1Content = pParas[0].replace(/^<p>/i, '') + '</p>';
          axe2Content = '<p>' + pParas[1].replace(/<\/p>$/i, '') + '</p>';
          if (pParas.length >= 3) {
            axe3Content = '<p>' + pParas.slice(2).join('</p><p>') + '</p>';
          }
        } else {
          axe1Content = bodyMatch[1].trim();
        }
      }
    }

    if (!introContent || !conclContent) {
      const rawParas = raw.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      if (rawParas.length >= 3) {
        introContent = rawParas[0];
        axe1Content = rawParas[1];
        if (rawParas.length === 3) {
          conclContent = rawParas[2];
        } else if (rawParas.length === 4) {
          axe2Content = rawParas[2];
          conclContent = rawParas[3];
        } else if (rawParas.length >= 5) {
          axe2Content = rawParas[2];
          axe3Content = rawParas.slice(3, -1).join('\n\n');
          conclContent = rawParas[rawParas.length - 1];
        }
      }
    }

    const wrapSection = (badgeText: string, badgeBg: string, borderColor: string, bgColor: string, content: string) => {
      if (!content || !content.trim()) return '';
      return `
        <div style="margin-top:18px; margin-bottom:18px;">
          <div style="margin-bottom:8px;">
            <span style="background:${badgeBg}; color:#ffffff; font-weight:800; font-size:0.76rem; padding:3px 11px; border-radius:6px; display:inline-flex; align-items:center; gap:5px; box-shadow:0 1px 3px rgba(0,0,0,0.12); text-transform:uppercase; letter-spacing:0.03em;">
              ${badgeText}
            </span>
          </div>
          <div style="background:${bgColor}; border-left:5px solid ${borderColor}; border:1px solid ${borderColor}40; border-left-width:5px; border-radius:0 12px 12px 0; padding:14px 16px; color:#1e293b; line-height:2.05; box-shadow:0 1px 3px rgba(0,0,0,0.03); text-align:justify; word-break:break-word; overflow-wrap:anywhere;">
            ${content.startsWith('<p>') ? content : `<p>${content}</p>`}
          </div>
        </div>
      `;
    };

    let bodyHtml = '';
    if (introContent) {
      bodyHtml += wrapSection('📌 1. INTRODUCTION (ORANGE)', '#ea580c', '#ea580c', '#fff7ed', introContent);
      if (axe1Content) {
        bodyHtml += wrapSection('⚖️ 2. PREMIER AXE / THÈSE (BLEU)', '#2563eb', '#2563eb', '#eff6ff', axe1Content);
      }
      if (axe2Content) {
        const badgeColor = isDialectique ? '#9333ea' : '#0d9488';
        const badgeTitle = isDialectique ? '🔄 3. SECOND AXE / ANTITHÈSE (VIOLET)' : '🔍 3. SECOND AXE D\'ANALYSE (SARCELLE)';
        const bg = isDialectique ? '#faf5ff' : '#f0fdfa';
        bodyHtml += wrapSection(badgeTitle, badgeColor, badgeColor, bg, axe2Content);
      }
      if (axe3Content) {
        bodyHtml += wrapSection('💡 4. TROISIÈME AXE / SYNTHÈSE (SARCELLE)', '#0d9488', '#0d9488', '#f0fdfa', axe3Content);
      }
      if (conclContent) {
        bodyHtml += wrapSection('🎯 5. CONCLUSION (VERT ÉMERAUDE)', '#059669', '#059669', '#ecfdf5', conclContent);
      }
    } else {
      bodyHtml = raw;
    }

    bodyHtml = highlightConnectors(bodyHtml);

    const worksTerms = [
      'La Boîte à Merveilles', 'La Boite a Merveilles', 'Ahmed Sefrioui', 'Sidi Mohammed', 'Lalla Zoubida', 'Maâlem Abdeslam', 'Maalem Abdeslam', 'Lalla Aïcha', 'Lalla Aicha', 'Dar Chouafa', 'la voyante Kenza', 'la voyante', 'Sidi El Arafi', 'le fqih', 'le Msid', 'Zineb', 'Rahma', 'Fatma Bziouya', 'Moulay Larbi', 'Sidi Ali Boughaleb',
      'Antigone', 'Jean Anouilh', 'Créon', 'Creon', 'Ismène', 'Ismene', 'Hémon', 'Hemon', 'Polynice', 'Étéocle', 'Eteocle', 'Eurydice', 'Le Chœur', 'Le Choeur', 'La Nourrice', 'Thèbes', 'Thebes',
      'Le Dernier Jour d’un Condamné', "Le Dernier Jour d'un Condamné", 'Victor Hugo', 'Bicêtre', 'Bicetre', 'la Conciergerie', 'la guillotine', 'la peine de mort', 'la place de Grève', 'la place de Greve', 'la petite Marie', 'le friauche', 'le bourreau Samson'
    ];
    for (const w of worksTerms) {
      const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<!<strong[^>]*>)(?<![a-zA-ZÀ-ÿ0-9_])(${escaped})(?![a-zA-ZÀ-ÿ0-9_])(?!<\\/strong>)`, 'gi');
      bodyHtml = bodyHtml.replace(regex, '<strong class="work-example" style="color:#064e3b !important; font-weight:800 !important; font-style:italic !important; background-color:#ecfdf5 !important; padding:1px 6px !important; border-radius:4px !important; border:1px solid #a7f3d0 !important; display:inline-block !important;">$1</strong>');
    }

    return planHeaderHtml + bodyHtml;
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
      const sanitizedTable = cleanTableMarkdown(tableRaw);
      const lines = sanitizedTable.split('\n');
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
      localStorage.setItem('akhawayn_auth', 'true');
      localStorage.setItem('akhawayn_pwd', pwd);
      sessionStorage.setItem('akhawayn_auth', 'true');
    } catch {}
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
      const rawTable = extract('TABLEAU');
      const parsedTable = cleanTableMarkdown(rawTable);
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
        outReform.innerHTML = formatReformulation(reformContent);
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

      const planAExtracted = extract('PLAN_A');
      const planBExtracted = extract('PLAN_B');

      const buildDefaultPlanA = () => `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du roman autobiographique <em>La Boîte à Merveilles</em> d'Ahmed Sefrioui ainsi que des œuvres majeures au programme, on se rend compte que la réflexion autour de « ${sujet.slice(0, 75)} » constitue un enjeu littéraire, humain et moral fondamental. En effet, tandis que certains perçoivent les épreuves et les traditions comme des contraintes pesantes, d'autres y découvrent un socle structurant indispensable à l'édification de la conscience personnelle. Dès lors, convient-il d'appréhender cette réalité comme un carcan aliénant ou au contraire comme un cheminement formateur vers la maturité ? Pour répondre avec rigueur à cette problématique, il conviendra d'examiner dans un premier axe la valeur émancipatrice de la lucidité intérieure, avant d'analyser dans un second axe les impératifs de la solidarité humaine.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, l'affirmation d'une pensée autonome permet à l'individu de préserver son authenticité face aux pressions extérieures et aux illusions du monde social. C'est précisément ce que révèle l'univers poétique de <strong>Sidi Mohammed dans La Boîte à Merveilles</strong> : face aux querelles de <strong>Dar Chouafa</strong> et aux déceptions du réel, sa boîte magique et son imaginaire constituent un sanctuaire inviolable de liberté spirituelle. De même, dans la tragédie moderne, <strong>l'héroïne Antigone de Jean Anouilh</strong> proclame avec une grandeur sublime son refus des faux compromis, préférant périr plutôt que de salir la pureté de son idéal moral. Ainsi, la fidélité à ses convictions intimes confère à l'être une dignité inaliénable.</p>
</div>

<div class="model-axe2">
<p><strong>En second lieu</strong>, cette quête d'indépendance ne saurait toutefois faire oublier la fragilité inhérente à la condition humaine lorsque les liens collectifs viennent à se rompre. L'œuvre bouleversante de <strong>Victor Hugo dans Le Dernier Jour d'un Condamné</strong> en administre la preuve la plus saisissante : séquestré dans l'obscurité de <strong>Bicêtre</strong>, le captif mesure combien l'isolement forcé détruit l'esprit et combien le respect de la vie humaine exige une compassion universelle. De plus, l'épreuve de la ruine financière vécue par <strong>Maâlem Abdeslam et Lalla Zoubida</strong> démontre que seule l'entraide fraternelle permet de triompher des vicissitudes du sort. Dès lors, l'autonomie ne trouve son plein sens que dans l'harmonie avec autrui.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, la réflexion menée met en lumière la nécessité d'allier souveraineté morale et bienveillance communautaire. Loin de s'opposer, la force de l'esprit critique et la chaleur des solidarités humaines se fécondent mutuellement pour façonner une personnalité éclairée. En définitive, la véritable sagesse ne réside-t-elle pas dans cet équilibre souverain entre liberté intérieure et générosité envers son prochain ?</p>
</div>`;

      const buildDefaultPlanB = () => `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive des œuvres littéraires au programme du Baccalauréat, on se rend compte que le débat suscité par « ${sujet.slice(0, 75)} » confronte deux exigences complémentaires de l'existence. D'une part, une vision pragmatique impose le respect des devoirs établis et la soumission aux nécessités sociales pour garantir la cohésion du groupe. D'autre part, une conscience exigeante revendique le droit inaliénable de questionner l'ordre existant au nom d'un idéal de justice supérieur. Dès lors, comment concilier le réalisme des contraintes partagées et l'aspiration légitime à la liberté morale ? Il conviendra d'analyser dans une première partie le bien-fondé des impératifs collectifs, d'envisager dans une deuxième partie la légitimité du sursaut individuel, afin de dégager dans une troisième partie les voies d'une synthèse équilibrée.</p>
</div>

<div class="model-axe1">
<p><strong>D'une part</strong>, l'inscription sincère dans la communauté et l'acceptation de ses règles fondent la sécurité et la continuité morale de l'existence. Dans <strong>La Boîte à Merveilles</strong>, le courage discret du tisserand <strong>Maâlem Abdeslam</strong> qui part travailler aux moissons pour subvenir aux besoins des siens prouve que la fidélité au devoir familial surmonte les plus rudes crises. De même, les arguments d'État présentés par <strong>Créon dans Antigone</strong> rappellent avec gravité que la sauvegarde de la cité requiert l'obéissance aux lois communes afin de prémunir les hommes contre l'anarchie. L'intérêt général commande donc une discipline loyale.</p>
</div>

<div class="model-axe2">
<p><strong>D'autre part</strong>, l'obéissance aveugle devient inacceptable lorsqu'elle bafoue les valeurs sacrées de la conscience et de l'équité. La voix passionnée de <strong>Victor Hugo dans Le Dernier Jour d'un Condamné</strong> s'élève pour dénoncer l'atrocité de la guillotine dressée sur <strong>la place de Grève</strong>, démontrant qu'aucune institution ne peut s'arroger le droit de massacrer un être humain. Parallèlement, <strong>Antigone</strong> oppose le devoir fraternel et l'amour immortel aux décrets tyranniques, incarnant le refus héroïque de l'injustice. L'honneur humain réside dans cette résistance sacrée de la conscience morale.</p>
</div>

<div class="model-axe3">
<p><strong>Dès lors</strong>, la solution féconde réside dans une synthèse souveraine où les règles de la société se perfectionnent au contact des aspirations éthiques. Il s'agit d'édifier un ordre juste qui ne repose pas sur la contrainte aveugle mais sur l'adhésion lucide et le respect absolu de la dignité humaine. C'est à ce point de rencontre entre devoir et liberté que s'épanouit une citoyenneté responsable et généreuse.</p>
</div>

<div class="model-concl">
<p><strong>En somme</strong>, ce débat invite à dépasser les clivages superficiels pour affirmer la suprématie de la lucidité et de l'empathie. Les leçons tirées de nos chefs-d'œuvre littéraires rappellent que la véritable grandeur humaine s'accomplit dans la conciliation courageuse de l'idéal éthique et du respect d'autrui. Ne revient-il pas dès lors à chacun d'œuvrer quotidiennement à cette exigeante concorde ?</p>
</div>`;

      planARef.current = (planAExtracted && planAExtracted.trim().length > 150) ? planAExtracted : buildDefaultPlanA();
      planBRef.current = (planBExtracted && planBExtracted.trim().length > 150) ? planBExtracted : buildDefaultPlanB();

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
          planARef.current = `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du roman autobiographique <em>La Boîte à Merveilles</em> d'Ahmed Sefrioui ainsi que des œuvres majeures au programme, on se rend compte que la réflexion autour de « ${sujet.slice(0, 75)} » constitue un enjeu littéraire, humain et moral fondamental. En effet, tandis que certains perçoivent les épreuves et les traditions comme des contraintes pesantes, d'autres y découvrent un socle structurant indispensable à l'édification de la conscience personnelle. Dès lors, convient-il d'appréhender cette réalité comme un carcan aliénant ou au contraire comme un cheminement formateur vers la maturité ? Pour répondre avec rigueur à cette problématique, il conviendra d'examiner dans un premier axe la valeur émancipatrice de la lucidité intérieure, avant d'analyser dans un second axe les impératifs de la solidarité humaine.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, l'affirmation d'une pensée autonome permet à l'individu de préserver son authenticité face aux pressions extérieures et aux illusions du monde social. C'est précisément ce que révèle l'univers poétique de <strong>Sidi Mohammed dans La Boîte à Merveilles</strong> : face aux querelles de Dar Chouafa et aux déceptions du réel, sa boîte magique et son imaginaire constituent un sanctuaire inviolable de liberté spirituelle. De même, dans la tragédie moderne, <strong>l'héroïne Antigone de Jean Anouilh</strong> proclame avec une grandeur sublime son refus des faux compromis, préférant périr plutôt que de salir la pureté de son idéal moral. Ainsi, la fidélité à ses convictions intimes confère à l'être une dignité inaliénable.</p>
</div>

<div class="model-axe2">
<p><strong>En second lieu</strong>, cette quête d'indépendance ne saurait toutefois faire oublier la fragilité inhérente à la condition humaine lorsque les liens collectifs viennent à se rompre. L'œuvre bouleversante de <strong>Victor Hugo dans Le Dernier Jour d'un Condamné</strong> en administre la preuve la plus saisissante : séquestré dans l'obscurité de <strong>Bicêtre</strong>, le captif mesure combien l'isolement forcé détruit l'esprit et combien le respect de la vie humaine exige une compassion universelle. De plus, l'épreuve de la ruine financière vécue par <strong>Maâlem Abdeslam et Lalla Zoubida</strong> démontre que seule l'entraide fraternelle permet de triompher des vicissitudes du sort. Dès lors, l'autonomie ne trouve son plein sens que dans l'harmonie avec autrui.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, la réflexion menée met en lumière la nécessité d'allier souveraineté morale et bienveillance communautaire. Loin de s'opposer, la force de l'esprit critique et la chaleur des solidarités humaines se fécondent mutuellement pour façonner une personnalité éclairée. En définitive, la véritable sagesse ne réside-t-elle pas dans cet équilibre souverain entre liberté intérieure et générosité envers son prochain ?</p>
</div>`;
        }
        if (!planBRef.current) {
          planBRef.current = `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive des œuvres littéraires au programme du Baccalauréat, on se rend compte que le débat suscité par « ${sujet.slice(0, 75)} » confronte deux exigences complémentaires de l'existence. D'une part, une vision pragmatique impose le respect des devoirs établis et la soumission aux nécessités sociales pour garantir la cohésion du groupe. D'autre part, une conscience exigeante revendique le droit inaliénable de questionner l'ordre existant au nom d'un idéal de justice supérieur. Dès lors, comment concilier le réalisme des contraintes partagées et l'aspiration légitime à la liberté morale ? Il conviendra d'analyser dans une première partie le bien-fondé des impératifs collectifs, d'envisager dans une deuxième partie la légitimité du sursaut individuel, afin de dégager dans une troisième partie les voies d'une synthèse équilibrée.</p>
</div>

<div class="model-axe1">
<p><strong>D'une part</strong>, l'inscription sincère dans la communauté et l'acceptation de ses règles fondent la sécurité et la continuité morale de l'existence. Dans <strong>La Boîte à Merveilles</strong>, le courage discret du tisserand <strong>Maâlem Abdeslam</strong> qui part travailler aux moissons pour subvenir aux besoins des siens prouve que la fidélité au devoir familial surmonte les plus rudes crises. De même, les arguments d'État présentés par <strong>Créon dans Antigone</strong> rappellent avec gravité que la sauvegarde de la cité requiert l'obéissance aux lois communes afin de prémunir les hommes contre l'anarchie. L'intérêt général commande donc une discipline loyale.</p>
</div>

<div class="model-axe2">
<p><strong>D'autre part</strong>, l'obéissance aveugle devient inacceptable lorsqu'elle bafoue les valeurs sacrées de la conscience et de l'équité. La voix passionnée de <strong>Victor Hugo dans Le Dernier Jour d'un Condamné</strong> s'élève pour dénoncer l'atrocité de la guillotine dressée sur <strong>la place de Grève</strong>, démontrant qu'aucune institution ne peut s'arroger le droit de massacrer un être humain. Parallèlement, <strong>Antigone</strong> oppose le devoir fraternel et l'amour immortel aux décrets tyranniques, incarnant le refus héroïque de l'injustice. L'honneur humain réside dans cette résistance sacrée de la conscience morale.</p>
</div>

<div class="model-axe3">
<p><strong>Dès lors</strong>, la solution féconde réside dans une synthèse souveraine où les règles de la société se perfectionnent au contact des aspirations éthiques. Il s'agit d'édifier un ordre juste qui ne repose pas sur la contrainte aveugle mais sur l'adhésion lucide et le respect absolu de la dignité humaine. C'est à ce point de rencontre entre devoir et liberté que s'épanouit une citoyenneté responsable et généreuse.</p>
</div>

<div class="model-concl">
<p><strong>En somme</strong>, ce débat invite à dépasser les clivages superficiels pour affirmer la suprématie de la lucidité et de l'empathie. Les leçons tirées de nos chefs-d'œuvre littéraires rappellent que la véritable grandeur humaine s'accomplit dans la conciliation courageuse de l'idéal éthique et du respect d'autrui. Ne revient-il pas dès lors à chacun d'œuvrer quotidiennement à cette exigeante concorde ?</p>
</div>`;
        }

        displayM('A');
        reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const saveCurrentToArchives = async () => {
    const workSelect = ((document.getElementById('archiveSelectWork') as HTMLSelectElement)?.value || 'boite') as 'boite' | 'antigone' | 'condamne';
    const rNom = document.getElementById('rNom')?.innerText || studentName || 'Candidat';
    const rTotal = document.getElementById('rTotal')?.innerText || 'N/A';
    const outReform = document.getElementById('outReform')?.innerHTML || '';
    const outModel = document.getElementById('outModel')?.innerHTML || '';

    if (!outReform && !outModel) {
      alert("Veuillez d'abord lancer l'évaluation pour obtenir et enregistrer le texte optimisé dans la boîte.");
      return;
    }

    const newEntry = {
      id: 'arch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      work: workSelect,
      candidateName: rNom.trim() || 'Candidat',
      filiere: filiere || '1ère BAC',
      score: rTotal,
      sujet: sujet || '',
      texte: texte || '',
      reformulations: outReform,
      modelText: outModel,
      planA: planARef.current,
      planB: planBRef.current,
      date: new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    // 1. Enregistrement prioritaire et immédiat dans le navigateur de l'élève (localStorage)
    const currentArchives = getStoredArchives();
    const updatedWorkList = [newEntry, ...(currentArchives[workSelect] || [])];
    const updatedArchives = {
      ...currentArchives,
      [workSelect]: updatedWorkList,
    };

    try {
      localStorage.setItem('akhawayn_student_archives', JSON.stringify(updatedArchives));
      // Maintien absolu de la session déverrouillée dans le navigateur
      localStorage.setItem('akhawayn_auth', 'true');
      localStorage.setItem('akhawayn_pwd', sessionPassword || 'AKHAWAYN2026');
      sessionStorage.setItem('akhawayn_auth', 'true');
    } catch (err) {
      console.warn('Erreur écriture localStorage archives:', err);
    }

    setIsUnlocked(true);
    setArchives(updatedArchives);

    const workNames: Record<string, string> = {
      boite: 'La Boîte à Merveilles',
      antigone: 'Antigone',
      condamne: "Le Dernier Jour d'un Condamné",
    };
    const workLabel = workNames[workSelect] || workSelect;
    setSaveToast(`Production enregistrée avec succès dans votre navigateur (${workLabel}) ! Vos révisions y sont conservées pour toute l'année.`);
    setTimeout(() => setSaveToast(null), 4500);

    // 2. Synchronisation de secours en arrière-plan avec le serveur
    try {
      await fetch('/api/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });
    } catch {
      // Ignorer : la copie est déjà sauvegardée avec succès à 100% dans le navigateur de l'élève
    }
  };

  const deleteArchive = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette production de votre boîte ?')) return;

    // 1. Suppression immédiate dans le navigateur de l'élève (localStorage)
    const currentArchives = getStoredArchives();
    const updatedArchives = {
      boite: (currentArchives.boite || []).filter((item: any) => item.id !== id),
      antigone: (currentArchives.antigone || []).filter((item: any) => item.id !== id),
      condamne: (currentArchives.condamne || []).filter((item: any) => item.id !== id),
    };

    try {
      localStorage.setItem('akhawayn_student_archives', JSON.stringify(updatedArchives));
    } catch (err) {
      console.warn('Erreur mise à jour localStorage:', err);
    }
    setArchives(updatedArchives);

    // 2. Suppression de secours en tâche de fond sur le serveur
    try {
      await fetch(`/api/archives/${id}`, { method: 'DELETE' });
    } catch {
      // Ignorer si hors-ligne
    }
  };

  const renderPasswordChangeModal = () => (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 text-left">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-outfit font-bold text-base leading-tight">Accès réservé à la direction</h3>
              <span className="text-[11px] text-slate-400 font-medium">
                {passwordChangeStep === 'KEY' ? 'Étape 1 : Habilitation confidentielle' : 'Étape 2 : Nouveau mot de passe'}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setShowChangeModal(false);
              setPasswordChangeStep('KEY');
              setMasterKeyInput('');
              setChangeFeedback(null);
            }}
            className="text-slate-400 hover:text-white text-xl leading-none px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* ÉTAPE 1 : HABILITATION PAR CLÉ SECRÈTE DIRECTION */}
        {passwordChangeStep === 'KEY' ? (
          <form onSubmit={handleVerifyMasterKey} className="p-6 space-y-4">
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
              <span className="text-lg">🛡️</span>
              <div>
                <span className="font-bold block text-sm text-[#b45309]">Habilitation Sécurisée Direction</span>
                <span className="text-[11px] text-amber-900 leading-relaxed block mt-0.5">
                  Saisissez votre <strong>identifiant confidentiel unique</strong> (votre adresse personnelle suivie de 2026). Ce champ est strictement masqué : il ne s'affiche jamais à l'écran et n'est pas mémorisé par le navigateur.
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Clé Secrète d'Habilitation
                </label>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Confidentiel
                </span>
              </div>
              <div className="relative">
                <input
                  type={showMasterKey ? 'text' : 'password'}
                  value={masterKeyInput}
                  onChange={(e) => setMasterKeyInput(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••"
                  className="w-full py-3.5 pl-4 pr-12 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none font-mono text-sm tracking-widest transition"
                  required
                  autoFocus
                  autoComplete="new-password"
                  data-lpignore="true"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterKey(!showMasterKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 p-1 cursor-pointer"
                  title={showMasterKey ? 'Masquer' : 'Afficher'}
                >
                  {showMasterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Seul l'administrateur titulaire détient cette combinaison secrète.
              </span>
            </div>

            {changeFeedback && (
              <div className={`p-3 rounded-xl text-xs font-medium ${changeFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                {changeFeedback.message}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowChangeModal(false);
                  setMasterKeyInput('');
                  setChangeFeedback(null);
                }}
                className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isChanging}
                className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {isChanging ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Vérification...</span>
                  </>
                ) : (
                  <>
                    <span>🔓</span>
                    <span>Valider mon habilitation</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* ÉTAPE 2 : DÉFINITION DU NOUVEAU MOT DE PASSE */
          <form onSubmit={handleSaveNewPassword} className="p-6 space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-emerald-900">Habilitation confirmée avec succès !</span>
                <span className="text-[11px] text-emerald-800">
                  Veuillez saisir votre mot de passe actuel puis définir votre nouveau mot de passe direction.
                </span>
              </div>
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
                autoComplete="current-password"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Nouveau mot de passe (min 4 caractères)..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                required
                autoComplete="new-password"
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
                autoComplete="new-password"
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
                  setPasswordChangeStep('KEY');
                  setChangeFeedback(null);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ← Modifier la clé
              </button>
              <button
                type="submit"
                disabled={isChanging}
                className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isChanging ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

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
                Mot de Passe Candidat (Mot de passe actuel)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Introduire le mot de passe actuel..."
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

            {authNotice && (
              <div className="p-3.5 bg-amber-950/70 border border-amber-500/60 text-amber-200 text-xs rounded-xl flex items-start gap-2.5 shadow-inner">
                <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span className="leading-relaxed font-medium">{authNotice}</span>
              </div>
            )}

            {authError && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{authError}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-[11px] text-amber-300/90 bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/60">
              <span className="text-sm">💾</span>
              <span>Enregistrement direct et garanti dans ce navigateur : vous n'aurez plus besoin de le ressaisir à chaque visite.</span>
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest transition shadow-lg active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>Vérification & Mémorisation...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Valider & Mémoriser sur ce navigateur</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-[11px] text-slate-500 italic">
            Session sécurisée • Direction Pédagogique Al Akhawayn Tamansourte
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans p-3 sm:p-6 md:p-10 antialiased selection:bg-amber-100 selection:text-amber-900">
      
      {/* BARRE SUPÉRIEURE DISCRÈTE D'ADMINISTRATION & ARCHIVES */}
      <div className="max-w-5xl mx-auto mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 px-1 sm:px-2 no-print">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Bouton Accès réservé à la direction (sert uniquement si la direction va changer le mot de passe) */}
          <button
            type="button"
            onClick={() => {
              setPasswordChangeStep('KEY');
              setMasterKeyInput('');
              setOldPasswordInput('');
              setNewPasswordInput('');
              setConfirmPasswordInput('');
              setChangeFeedback(null);
              setShowChangeModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-300 shadow-2xs transition cursor-pointer"
            title="Accès réservé à la direction pour modifier le mot de passe"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Accès réservé à la direction</span>
          </button>

          {/* Bouton Mot de passe Candidat (Mémorisé dans le navigateur) */}
          <button
            type="button"
            onClick={() => {
              setCandidatePasswordInput(localStorage.getItem('akhawayn_pwd') || sessionPassword || 'AKHAWAYN2026');
              setCandidateFeedback(null);
              setShowCandidateModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-300 shadow-2xs transition cursor-pointer"
            title="Consulter le mot de passe mémorisé dans votre navigateur"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Mot de passe mémorisé</span>
          </button>
        </div>

        {/* Boutons d'accès aux 3 boîtes d'œuvres */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => { setSelectedWorkBox('boite'); setViewingArchiveItem(null); }}
            className="flex-1 sm:flex-none text-[10px] sm:text-[11px] font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 sm:px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="Consulter les productions enregistrées pour La Boîte à Merveilles"
          >
            <span>📦 La Boîte à Merveilles</span>
            <span className="bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded-full font-black text-[10px]">{archives.boite.length}</span>
          </button>
          <button
            type="button"
            onClick={() => { setSelectedWorkBox('antigone'); setViewingArchiveItem(null); }}
            className="flex-1 sm:flex-none text-[10px] sm:text-[11px] font-bold text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 px-2.5 sm:px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="Consulter les productions enregistrées pour Antigone"
          >
            <span>📜 Antigone</span>
            <span className="bg-indigo-200 text-indigo-950 px-1.5 py-0.2 rounded-full font-black text-[10px]">{archives.antigone.length}</span>
          </button>
          <button
            type="button"
            onClick={() => { setSelectedWorkBox('condamne'); setViewingArchiveItem(null); }}
            className="w-full sm:w-auto text-[10px] sm:text-[11px] font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 sm:px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="Consulter les productions enregistrées pour Le Dernier Jour d'un Condamné"
          >
            <span>⚖️ Le Dernier Jour d'un Condamné</span>
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
      <div className="max-w-5xl mx-auto bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 p-4 sm:p-8 md:p-12 relative overflow-hidden">
        
        {/* Ruban aux couleurs officielles en haut de la carte */}
        <div className="h-2.5 w-full absolute top-0 left-0 bg-gradient-to-r from-[#0b1528] via-[#c5221f] to-[#b45309]"></div>

        {/* En-tête officiel prestigieux */}
        <header className="text-center border-b-2 border-slate-900 pb-5 sm:pb-7 mb-6 sm:mb-8 mt-1 sm:mt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full mb-3">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-amber-800">
              Système Officiel d'Évaluation Pédagogique
            </span>
          </div>
          <h1 className="font-cinzel text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            CENTRE <span className="text-[#c5221f]">AL AKHAWAYN</span>
          </h1>
          <p className="font-outfit uppercase font-extrabold text-[11px] sm:text-sm text-[#b45309] tracking-wider sm:tracking-[0.25em] mt-2">
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
        <div id="reportSection" className="mt-8 sm:mt-12 pt-6 sm:pt-10 border-t-2 border-slate-900 hidden animate-fade-in relative overflow-hidden bg-white p-3.5 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl shadow-sm">
          
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
                <span className="font-cinzel text-sm sm:text-base font-bold tracking-wider text-white">
                  Centre d'Expertise & Ingénierie Pédagogique Al Akhawayn
                </span>
              </div>
            </div>

            {/* Fiche d'identification et Cachet d'assermentation */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
              <div className="space-y-3 flex-1">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#0b1528] text-amber-400 rounded-full text-xs font-black uppercase tracking-widest border border-amber-500/30">
                  Rapport Pédagogique Professionnel
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
                <div id="outBilan" className="p-4 sm:p-6 rounded-xl bg-slate-50 border border-slate-200 leading-relaxed text-sm sm:text-base"></div>
              </div>

              {/* 5. Optimisation Stylistique (Texte Optimisé - Min. 18 lignes) */}
              <div className="mb-8">
                <div className="mb-3">
                  <h3 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> 5. Optimisation Stylistique & Version Continue d'Excellence (Texte Optimisé • Min. 18 lignes)
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    Chirurgie des phrases faibles et réécriture intégrale en texte optimisé d'au moins 18 lignes rédigées, articulé par des liens logiques puissants en bleu et des exemples tirés de l'œuvre en gras vert émeraude. Langage fort, limpide et rigoureux, sans recours à un registre soutenu artificiel.
                  </p>
                </div>
                <div id="outReform" className="p-4 sm:p-6 rounded-xl bg-amber-50/40 border border-amber-200 leading-relaxed text-sm sm:text-base"></div>
              </div>

              {/* 6. Modèle de Référence Certifié (Norme Al Akhawayn) */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> 6. Modèles Rédigés d'Excellence (Norme Al Akhawayn • Min. 18 lignes)
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-950 text-xs font-black uppercase tracking-wider shadow-2xs">
                      <span>🎯 Modèle Actif :</span>
                      <span className="text-[#b45309]">
                        {activePlan === 'A' ? 'Option 1 : Plan Simple (Thématique) • Min. 18 lignes' : 'Option 2 : Plan Dialectique (Thèse / Antithèse) • Min. 18 lignes'}
                      </span>
                    </span>
                  </div>
                  
                  {/* Sélecteur de plan simple vs dialectique TOUJOURS PRÉSENT et accessible */}
                  <div id="tabSelectors" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 p-1 bg-slate-200 rounded-xl shadow-2xs w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => displayM('A')}
                      id="ts"
                      className={`tab-trigger px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex-1 ${activePlan === 'A' ? 'active' : 'text-slate-700 hover:text-slate-900'}`}
                    >
                      Option 1 : Plan Simple (Thématique)
                    </button>
                    <button
                      type="button"
                      onClick={() => displayM('B')}
                      id="td"
                      className={`tab-trigger px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex-1 ${activePlan === 'B' ? 'active' : 'text-slate-700 hover:text-slate-900'}`}
                    >
                      Option 2 : Plan Dialectique (Thèse / Antithèse)
                    </button>
                  </div>
                </div>

                <div className="mb-3 text-[11px] font-semibold text-slate-500">
                  <span>Modèles de référence certifiés conformes au Cadre de Référence officiel. Les deux options (Plan Simple et Plan Dialectique) comportent au minimum 18 lignes de texte rédigé avec des liens logiques puissants (en bleu), des exemples précis en gras tirés des œuvres au programme (en vert émeraude) et un langage fort sans registre soutenu artificiel.</span>
                </div>

                <div id="outModel" className="p-4 sm:p-6 rounded-xl bg-white border border-slate-200 font-newsreader text-sm sm:text-base leading-relaxed space-y-4"></div>
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

      {/* PIED DE PAGE OFFICIEL */}
      <footer className="max-w-5xl mx-auto mt-8 mb-4 text-center text-xs font-semibold text-slate-500 no-print flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-white/80 backdrop-blur-xs rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5 mx-auto sm:mx-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
          <span className="font-outfit font-bold text-slate-800 uppercase tracking-wider text-xs">
            Direction Pédagogique Al Akhawayn Tamansourte
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-medium">
          Plateforme Didactique Certifiée • Session Baccalauréat 2026
        </p>
      </footer>

      {/* MODAL BOÎTE D'ARCHIVES & RÉVISION PÉDAGOGIQUE - HAUTEMENT RESPONSIVE SMARTPHONE & DESKTOP */}
      {selectedWorkBox && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-5xl w-full p-3.5 sm:p-6 md:p-7 shadow-2xl border border-slate-200 flex flex-col h-[94vh] sm:h-[88vh] max-h-[96vh] overflow-hidden">
            
            {/* Si consultation d'une production spécifique */}
            {viewingArchiveItem ? (
              <div className="flex flex-col h-full overflow-hidden min-h-0">
                {/* En-tête de la fiche de révision - Totalement Responsive */}
                <div className="pb-2.5 sm:pb-3 border-b border-slate-200 mb-2.5 sm:mb-3 shrink-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setViewingArchiveItem(null)}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0"
                    >
                      <span>⬅️</span>
                      <span className="text-[11px] sm:text-xs">Retour</span>
                    </button>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
                        title="Imprimer pour réviser à la maison"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Imprimer</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setViewingArchiveItem(null); setSelectedWorkBox(null); }}
                        className="p-1 sm:p-1.5 text-slate-500 hover:text-slate-900 text-base sm:text-lg cursor-pointer rounded-lg hover:bg-slate-100 transition"
                        title="Fermer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Titre de l'œuvre et note */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <h3 className="font-cinzel text-sm sm:text-base md:text-lg font-black text-slate-950 flex items-center gap-2">
                      <span>{selectedWorkBox === 'boite' ? '📦 La Boîte à Merveilles' : (selectedWorkBox === 'antigone' ? '📜 Antigone' : '⚖️ Le Dernier Jour d\'un Condamné')}</span>
                    </h3>
                    <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 shrink-0 shadow-2xs">
                      Note : {viewingArchiveItem.score}
                    </span>
                  </div>

                  {/* Métadonnées candidat */}
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold break-words leading-tight">
                    👤 {viewingArchiveItem.candidateName} • 🎓 {viewingArchiveItem.filiere} • 📅 Déposé le {viewingArchiveItem.date}
                  </p>
                </div>

                {/* Rappel du Sujet Traité */}
                <div className="p-2.5 sm:p-3 bg-amber-50/80 border border-amber-200 rounded-xl mb-2.5 shrink-0 text-xs text-amber-950 break-words">
                  <span className="font-extrabold uppercase text-[10px] tracking-wider text-amber-900 block mb-0.5">
                    📌 Sujet Officiel Traité :
                  </span>
                  <p className="italic font-medium leading-relaxed text-[11px] sm:text-xs">« {viewingArchiveItem.sujet || 'Sujet non spécifié'} »</p>
                </div>

                {/* Onglets de révision avec scroll tactile sur mobile */}
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2.5 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none shrink-0 -mx-1 px-1">
                  <button
                    type="button"
                    onClick={() => setArchiveActiveTab('optimized')}
                    className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                      archiveActiveTab === 'optimized'
                        ? 'bg-[#0b1528] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>✨</span>
                    <span>Texte Optimisé</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveActiveTab('model')}
                    className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                      archiveActiveTab === 'model'
                        ? 'bg-[#0b1528] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>🏆</span>
                    <span className="hidden sm:inline">Modèle de Référence (Norme Al Akhawayn)</span>
                    <span className="sm:hidden">Modèle Certifié</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveActiveTab('original')}
                    className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
                      archiveActiveTab === 'original'
                        ? 'bg-[#0b1528] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>📝</span>
                    <span className="hidden sm:inline">Copie Initiale Déposée</span>
                    <span className="sm:hidden">Copie Initiale</span>
                  </button>
                </div>

                {/* Corps de l'onglet actif avec scroll fluide */}
                <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 pb-2 min-h-0">
                  {archiveActiveTab === 'optimized' && (
                    <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-amber-50/30 border border-amber-200 leading-relaxed text-slate-900 text-xs sm:text-sm break-words overflow-x-hidden">
                      {viewingArchiveItem.reformulations ? (
                        <div dangerouslySetInnerHTML={{ __html: viewingArchiveItem.reformulations }} />
                      ) : (
                        <p className="text-slate-400 italic">Aucune version optimisée sauvegardée pour cette copie.</p>
                      )}
                    </div>
                  )}

                  {archiveActiveTab === 'model' && (
                    <div className="space-y-3">
                      {(viewingArchiveItem.planA || viewingArchiveItem.planB) && (
                        <div className="flex items-center gap-1.5 p-1 bg-slate-200 rounded-xl">
                          <button
                            type="button"
                            onClick={() => setArchiveModelPlanTab('A')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex-1 text-center ${
                              archiveModelPlanTab === 'A' ? 'bg-[#0b1528] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300/60'
                            }`}
                          >
                            Option 1 : Plan Simple (Min. 18 lignes)
                          </button>
                          <button
                            type="button"
                            onClick={() => setArchiveModelPlanTab('B')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex-1 text-center ${
                              archiveModelPlanTab === 'B' ? 'bg-[#0b1528] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300/60'
                            }`}
                          >
                            Option 2 : Plan Dialectique (Min. 18 lignes)
                          </button>
                        </div>
                      )}
                      <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 leading-relaxed text-slate-900 text-xs sm:text-sm break-words overflow-x-hidden">
                        {(viewingArchiveItem.planA || viewingArchiveItem.planB) ? (
                          <div
                            dangerouslySetInnerHTML={{
                              __html: formatModelPlan(
                                archiveModelPlanTab === 'A'
                                  ? (viewingArchiveItem.planA || viewingArchiveItem.modelText)
                                  : (viewingArchiveItem.planB || viewingArchiveItem.modelText),
                                archiveModelPlanTab === 'A' ? 'SIMPLE' : 'DIALECTIQUE'
                              ),
                            }}
                          />
                        ) : viewingArchiveItem.modelText ? (
                          <div dangerouslySetInnerHTML={{ __html: viewingArchiveItem.modelText }} />
                        ) : (
                          <p className="text-slate-400 italic">Aucun modèle de référence associé enregistré.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {archiveActiveTab === 'original' && (
                    <div className="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 leading-relaxed text-slate-800 whitespace-pre-wrap font-serif text-xs sm:text-sm break-words overflow-x-hidden">
                      {viewingArchiveItem.texte || 'Aucun texte initial renseigné.'}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Liste des copies de la boîte sélectionnée */
              <div className="flex flex-col h-full overflow-hidden min-h-0">
                <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-200 mb-3 sm:mb-4 gap-2 shrink-0">
                  <div className="min-w-0 pr-1">
                    <h3 className="font-cinzel text-base sm:text-xl font-black text-slate-950 leading-tight">
                      Boîtes d'Archives Pédagogiques
                    </h3>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5 leading-snug">
                      Consultation & Révision des Productions (Enregistrées dans votre navigateur)
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setSelectedWorkBox(null)} 
                    className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 text-base sm:text-lg cursor-pointer shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 transition"
                    title="Fermer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 border-b border-slate-200 pb-2.5 overflow-x-auto scrollbar-none shrink-0 -mx-1 px-1">
                  <button
                    type="button"
                    onClick={() => { setSelectedWorkBox('boite'); setViewingArchiveItem(null); }}
                    className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider cursor-pointer transition flex items-center gap-1.5 ${
                      selectedWorkBox === 'boite' ? 'bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>📦</span>
                    <span>La Boîte à Merveilles</span>
                    <span className="bg-amber-200/90 text-amber-950 px-1.5 py-0.2 rounded-full font-black text-[10px]">{archives.boite.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedWorkBox('antigone'); setViewingArchiveItem(null); }}
                    className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider cursor-pointer transition flex items-center gap-1.5 ${
                      selectedWorkBox === 'antigone' ? 'bg-indigo-100 text-indigo-950 border border-indigo-300 shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>📜</span>
                    <span>Antigone</span>
                    <span className="bg-indigo-200/90 text-indigo-950 px-1.5 py-0.2 rounded-full font-black text-[10px]">{archives.antigone.length}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSelectedWorkBox('condamne'); setViewingArchiveItem(null); }}
                    className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider cursor-pointer transition flex items-center gap-1.5 ${
                      selectedWorkBox === 'condamne' ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>⚖️</span>
                    <span>Le Dernier Jour d'un Condamné</span>
                    <span className="bg-emerald-200/90 text-emerald-950 px-1.5 py-0.2 rounded-full font-black text-[10px]">{archives.condamne.length}</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 sm:pr-2 min-h-0">
                  {archives[selectedWorkBox]?.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center text-slate-400 text-xs sm:text-sm font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <span className="text-3xl block mb-2">📁</span>
                      Aucune production enregistrée pour le moment dans cette boîte sur votre navigateur.<br />
                      <span className="text-[11px] sm:text-xs text-slate-400 mt-1 block">
                        Effectuez une évaluation et cliquez sur « Enregistrer dans la boîte » pour réviser vos textes optimisés à tout moment d'ici la fin d'année.
                      </span>
                    </div>
                  ) : (
                    archives[selectedWorkBox]?.map((item: any) => (
                      <div key={item.id} className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-amber-300 transition-all space-y-2.5 sm:space-y-3 shadow-2xs">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="min-w-0 flex-1">
                            <span className="font-extrabold text-[10px] uppercase tracking-wider text-amber-800 block mb-0.5">
                              📌 Sujet Officiel Traité :
                            </span>
                            <h4 className="font-bold text-slate-900 text-xs sm:text-sm italic leading-snug break-words">
                              « {item.sujet || 'Sujet non renseigné'} »
                            </h4>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-950 font-mono font-black text-[11px] sm:text-xs border border-emerald-300 shrink-0 shadow-2xs">
                            {item.score}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between text-[10px] sm:text-xs text-slate-500 pt-2 border-t border-slate-200 gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-600 font-semibold min-w-0">
                            <span className="truncate max-w-[120px] sm:max-w-none">👤 {item.candidateName}</span>
                            <span>•</span>
                            <span className="truncate max-w-[140px] sm:max-w-none">🎓 {item.filiere}</span>
                            <span>•</span>
                            <span>📅 {item.date || 'Date non renseignée'}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteArchive(item.id)}
                            className="text-rose-600 hover:text-rose-800 font-bold text-[11px] sm:text-xs cursor-pointer px-2 py-0.5 rounded hover:bg-rose-50 transition shrink-0"
                          >
                            Supprimer
                          </button>
                        </div>

                        {/* Bouton d'accès direct pour réviser la production */}
                        <button
                          type="button"
                          onClick={() => {
                            setViewingArchiveItem(item);
                            setArchiveActiveTab('optimized');
                          }}
                          className="w-full py-2.5 px-3 sm:px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer active:scale-[0.99] text-center"
                        >
                          <span className="shrink-0">📖</span>
                          <span className="truncate sm:whitespace-normal">Consulter la copie & réviser le texte optimisé ➔</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL MODIFICATION MOT DE PASSE ENSEIGNANT */}
      {showChangeModal && renderPasswordChangeModal()}

      {/* MODAL MOT DE PASSE CANDIDAT (POUR INTRODUIRE LE MOT DE PASSE ACTUEL) */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <User className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-outfit font-bold text-base leading-tight">Mot de passe candidat</h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Introduire le mot de passe actuel
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCandidateModal(false);
                  setCandidatePasswordInput('');
                  setCandidateFeedback(null);
                }}
                className="text-slate-400 hover:text-white text-xl leading-none px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifyCandidatePassword} className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
                <span className="text-lg">🛡️</span>
                <div>
                  <span className="font-bold block text-sm text-emerald-900">Enregistrement Garanti dans votre Navigateur</span>
                  <span className="text-[11px] text-emerald-800 leading-relaxed block mt-0.5">
                    Votre mot de passe est enregistré et mémorisé de façon permanente dans votre navigateur (localStorage). Vos sessions et vos boîtes d'œuvres restent accessibles sans avoir à le ressaisir à chaque fois.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showCandidatePassword ? 'text' : 'password'}
                    value={candidatePasswordInput}
                    onChange={(e) => setCandidatePasswordInput(e.target.value)}
                    placeholder="Saisissez le mot de passe actuel..."
                    className="w-full py-3 pl-4 pr-12 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none text-sm transition"
                    required
                    autoFocus
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCandidatePassword(!showCandidatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 p-1 cursor-pointer"
                    title={showCandidatePassword ? 'Masquer' : 'Afficher'}
                  >
                    {showCandidatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {candidateFeedback && (
                <div className={`p-3 rounded-xl text-xs font-medium ${candidateFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                  {candidateFeedback.message}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('akhawayn_auth');
                    localStorage.removeItem('akhawayn_pwd');
                    sessionStorage.removeItem('akhawayn_auth');
                    setIsUnlocked(false);
                    setShowCandidateModal(false);
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer flex items-center gap-1"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Verrouiller</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCandidateModal(false);
                      setCandidatePasswordInput('');
                      setCandidateFeedback(null);
                    }}
                    className="px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    disabled={isCheckingCandidate}
                    className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    {isCheckingCandidate ? 'Mémorisation...' : 'Valider & Mémoriser'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
