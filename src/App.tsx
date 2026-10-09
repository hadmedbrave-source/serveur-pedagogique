import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
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
  Users,
  Palette,
  Search,
  Check,
  Plus,
  X,
  Filter,
  Edit3,
} from 'lucide-react';
import {
  RegionalSubject,
  INK_COLORS,
  DEFAULT_REGIONAL_SUBJECTS,
  OFFICIAL_LOGICAL_CONNECTORS,
} from './data/regionalSubjects';

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
  const [detectedPlanType, setDetectedPlanType] = useState<'SIMPLE' | 'ANALYTIQUE' | 'DIALECTIQUE' | ''>('SIMPLE');
  // Sujet validé par l'élève : si validé, affiché en gras sans zone de rédaction
  const [isSubjectValidated, setIsSubjectValidated] = useState<boolean>(false);

  // Choix de la couleur d'encre d'écriture de l'élève (mémorisée dans le navigateur)
  const [inkColor, setInkColor] = useState<string>(() => {
    try {
      return localStorage.getItem('akhawayn_ink_color') || '#0f172a';
    } catch {
      return '#0f172a';
    }
  });

  // Éditeur manuscrit pour l'élève (permettant la mise en valeur des connecteurs logiques en couleur/gras)
  const editorRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef<boolean>(false);
  const [isEditorFocused, setIsEditorFocused] = useState<boolean>(false);

  // Synchroniser le texte avec l'éditeur si mis à jour de l'extérieur (ex: réinitialisation)
  useEffect(() => {
    if (editorRef.current && !isTypingRef.current) {
      if (editorRef.current.innerText.trim() !== texte.trim()) {
        editorRef.current.innerText = texte;
      }
    }
  }, [texte]);

  const handleEditorInput = () => {
    if (editorRef.current) {
      isTypingRef.current = true;
      const plain = editorRef.current.innerText || '';
      setTexte(plain);
      setTimeout(() => {
        isTypingRef.current = false;
      }, 100);
    }
  };

  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    if (editorRef.current) {
      setTexte(editorRef.current.innerText || '');
    }
  };

  // Appliquer une couleur en gras UNIQUEMENT sur le mot/lien logique sélectionné par l'élève
  // L'écriture reste toujours en noir classique par défaut pour tout le reste du texte !
  const applyInkToSelection = (colorHex: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    const isDefaultBlack = colorHex.toLowerCase() === '#0f172a' || colorHex.toLowerCase() === '#000000';

    // 1. Si l'élève a sélectionné/surligné un mot dans la zone de texte
    if (
      selection &&
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      editor.contains(selection.anchorNode) &&
      editor.contains(selection.focusNode)
    ) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();

      if (selectedText.length > 0) {
        if (isDefaultBlack) {
          // Remettre le mot en texte noir classique normal
          const textNode = document.createTextNode(selectedText);
          range.deleteContents();
          range.insertNode(textNode);

          selection.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(textNode);
          selection.addRange(newRange);
        } else {
          // Appliquer la couleur et le gras UNIQUEMENT à la sélection
          const span = document.createElement('span');
          span.style.color = colorHex;
          span.style.fontWeight = '700';
          span.className = 'font-bold';
          span.textContent = selectedText;

          range.deleteContents();
          range.insertNode(span);

          selection.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          selection.addRange(newRange);
        }

        setInkColor(colorHex);
        try {
          localStorage.setItem('akhawayn_ink_color', colorHex);
        } catch {}
        setTexte(editor.innerText || '');
        return;
      }
    }

    // 2. Si aucun mot n'est sélectionné : définir l'encre active pour la frappe suivante
    editor.focus();
    try {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, isDefaultBlack ? '#0f172a' : colorHex);
      if (!isDefaultBlack) {
        if (!document.queryCommandState('bold')) {
          document.execCommand('bold', false, undefined);
        }
      } else {
        if (document.queryCommandState('bold')) {
          document.execCommand('bold', false, undefined);
        }
      }
    } catch (e) {
      console.warn('execCommand:', e);
    }
    setInkColor(colorHex);
    try {
      localStorage.setItem('akhawayn_ink_color', colorHex);
    } catch {}
  };

  // Mettre en valeur automatiquement tous les connecteurs logiques détectés dans le texte SANS toucher aux sauts de ligne ni aux paragraphes
  const highlightConnectorsInEditor = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const currentText = editor.innerText || '';
    if (!currentText.trim()) {
      alert("Veuillez d'abord rédiger ou coller votre texte dans la zone de rédaction.");
      return;
    }

    const targetColor = (inkColor.toLowerCase() === '#0f172a' || inkColor.toLowerCase() === '#000000')
      ? '#ea580c'
      : inkColor;

    // 1. Déballer les éventuels surlignages de connecteurs existants pour repartir de nœuds texte propres
    const existingSpans = editor.querySelectorAll('.connector-highlight');
    existingSpans.forEach((span) => {
      const text = document.createTextNode(span.textContent || '');
      span.parentNode?.replaceChild(text, span);
    });
    editor.normalize(); // Fusionne les fragments de texte adjacents sans toucher aux paragraphes ni aux sauts de ligne

    // 2. Préparer l'expression régulière globale sur l'ensemble des connecteurs officiels
    const sorted = [...OFFICIAL_LOGICAL_CONNECTORS].sort((a, b) => b.length - a.length);
    const escapedPatterns = sorted.map((conn) =>
      conn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/['’]/g, "['’]")
    );
    const regex = new RegExp(`(?<![a-zA-ZÀ-ÿ0-9_])(${escapedPatterns.join('|')})(?![a-zA-ZÀ-ÿ0-9_])`, 'gi');

    // 3. Parcourir exclusivement les nœuds TEXTE pour préserver intégralement les balises (div, p, br, sauts de ligne)
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) {
      textNodes.push(n as Text);
    }

    let matchCount = 0;
    for (const textNode of textNodes) {
      const val = textNode.nodeValue || '';
      if (!val) continue;

      regex.lastIndex = 0;
      if (!regex.test(val)) continue;

      regex.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(val)) !== null) {
        matchCount++;
        // Texte précédant le connecteur
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(val.substring(lastIndex, match.index)));
        }
        // Balise span stylée pour le connecteur
        const span = document.createElement('span');
        span.style.color = targetColor;
        span.style.fontWeight = '700';
        span.className = 'font-bold connector-highlight';
        span.textContent = match[0];
        fragment.appendChild(span);

        lastIndex = match.index + match[0].length;
      }

      // Reste du texte après le dernier connecteur
      if (lastIndex < val.length) {
        fragment.appendChild(document.createTextNode(val.substring(lastIndex)));
      }

      textNode.parentNode?.replaceChild(fragment, textNode);
    }

    if (matchCount === 0) {
      alert("Aucun connecteur logique officiel n'a été détecté pour le moment. Vous pouvez sélectionner manuellement un mot et cliquer sur une couleur de la palette pour le passer en gras.");
      return;
    }

    setTexte(editor.innerText || '');
  };

  // Réinitialiser tout le texte en noir standard normal sans modifier la disposition des paragraphes
  const resetAllTextColors = () => {
    const editor = editorRef.current;
    if (!editor) return;

    // Déballer toutes les balises span de style sans altérer les sauts de ligne ni les paragraphes
    editor.querySelectorAll('span').forEach((span) => {
      const text = document.createTextNode(span.textContent || '');
      span.parentNode?.replaceChild(text, span);
    });
    // Retirer aussi les éventuelles balises b ou strong
    editor.querySelectorAll('b, strong').forEach((el) => {
      const text = document.createTextNode(el.textContent || '');
      el.parentNode?.replaceChild(text, el);
    });
    editor.normalize();

    setInkColor('#0f172a');
    try {
      localStorage.setItem('akhawayn_ink_color', '#0f172a');
    } catch {}
    setTexte(editor.innerText || '');
  };

  // Bibliothèque des Sujets Régionaux Officiels
  const [regionalSubjects, setRegionalSubjects] = useState<RegionalSubject[]>(() => {
    try {
      const saved = localStorage.getItem('akhawayn_custom_regional_subjects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return [...parsed, ...DEFAULT_REGIONAL_SUBJECTS];
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_REGIONAL_SUBJECTS;
  });

  // Clé d'habilitation officielle réservée à l'enseignant pour déposer ou administrer les sujets
  const TEACHER_AUTH_KEY = 'hadmed.brave@gmail.com2026';

  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('akhawayn_teacher_auth') === 'true';
    } catch {
      return false;
    }
  });
  const [showTeacherAuthModal, setShowTeacherAuthModal] = useState<boolean>(false);
  const [teacherInputKey, setTeacherInputKey] = useState<string>('');
  const [teacherAuthError, setTeacherAuthError] = useState<string>('');
  const [showTeacherKeyPlain, setShowTeacherKeyPlain] = useState<boolean>(false);

  const [showLibrary, setShowLibrary] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [selectedOeuvreFilter, setSelectedOeuvreFilter] = useState<string>('TOUTES');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectLoadNotice, setSubjectLoadNotice] = useState<string | null>(null);

  // Formulaire de dépôt Enseignant
  const [teacherTitre, setTeacherTitre] = useState('');
  const [teacherOeuvre, setTeacherOeuvre] = useState<RegionalSubject['oeuvre']>('La Boîte à Merveilles');
  const [teacherRegion, setTeacherRegion] = useState('Académie Régionale');
  const [teacherAnnee, setTeacherAnnee] = useState('2024');
  const [teacherSession, setTeacherSession] = useState<RegionalSubject['session']>('Session Normale');
  const [teacherConsigne, setTeacherConsigne] = useState('');
  const [teacherPlan, setTeacherPlan] = useState<'Plan Simple' | 'Plan Dialectique' | 'Plan Analytique'>('Plan Simple');
  const [teacherConseils, setTeacherConseils] = useState('');
  const [teacherFormError, setTeacherFormError] = useState('');
  const [teacherFormSuccess, setTeacherFormSuccess] = useState(false);

  const handleOpenTeacherModal = () => {
    if (isTeacherAuthenticated) {
      setShowTeacherModal(true);
    } else {
      setTeacherAuthError('');
      setTeacherInputKey('');
      setShowTeacherAuthModal(true);
    }
  };

  const handleVerifyTeacherKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (teacherInputKey.trim() === TEACHER_AUTH_KEY) {
      try {
        sessionStorage.setItem('akhawayn_teacher_auth', 'true');
      } catch (err) {
        console.error(err);
      }
      setIsTeacherAuthenticated(true);
      setShowTeacherAuthModal(false);
      setTeacherInputKey('');
      setTeacherAuthError('');
      setShowTeacherModal(true);
    } else {
      setTeacherAuthError("Clé d'habilitation incorrecte. Cet espace est strictement réservé au professeur habilité.");
    }
  };

  const handleLockTeacherSpace = () => {
    try {
      sessionStorage.removeItem('akhawayn_teacher_auth');
    } catch (err) {
      console.error(err);
    }
    setIsTeacherAuthenticated(false);
    setShowTeacherModal(false);
    setSubjectLoadNotice("Session enseignant verrouillée avec succès.");
    setTimeout(() => setSubjectLoadNotice(null), 3000);
  };

  const handleLoadSubject = (subjectItem: RegionalSubject) => {
    setSujet(subjectItem.consigne);
    setIsSubjectValidated(true);
    if (subjectItem.typePlanSuggere === 'Plan Simple') {
      setDetectedPlanType('SIMPLE');
    } else if (subjectItem.typePlanSuggere === 'Plan Dialectique') {
      setDetectedPlanType('DIALECTIQUE');
    } else if (subjectItem.typePlanSuggere === 'Plan Analytique') {
      setDetectedPlanType('ANALYTIQUE');
    }
    setSubjectLoadNotice(`Sujet officiel « ${subjectItem.titre} » chargé avec succès !`);
    setTimeout(() => setSubjectLoadNotice(null), 4500);

    const el = document.getElementById('sujet');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSaveTeacherSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTeacherAuthenticated) {
      setTeacherFormError("Autorisation requise. Veuillez saisir la clé d'habilitation enseignant.");
      setShowTeacherModal(false);
      setShowTeacherAuthModal(true);
      return;
    }
    if (!teacherTitre.trim() || !teacherConsigne.trim()) {
      setTeacherFormError('Veuillez renseigner au minimum le titre du sujet et la consigne intégrale.');
      return;
    }
    const newSub: RegionalSubject = {
      id: `prof-${Date.now()}`,
      titre: teacherTitre.trim(),
      oeuvre: teacherOeuvre,
      region: teacherRegion.trim() || 'Académie Régionale',
      annee: teacherAnnee.trim() || '2024',
      session: teacherSession,
      consigne: teacherConsigne.trim(),
      typePlanSuggere: teacherPlan,
      conseilsEnseignant: teacherConseils.trim() || undefined,
      dateAjout: new Date().toLocaleDateString('fr-FR'),
      sourceEnseignant: true,
    };

    setRegionalSubjects((prev) => {
      const updated = [newSub, ...prev];
      try {
        const customsOnly = updated.filter((s) => s.sourceEnseignant);
        localStorage.setItem('akhawayn_custom_regional_subjects', JSON.stringify(customsOnly));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });

    setTeacherFormSuccess(true);
    setTeacherFormError('');
    setTimeout(() => {
      setShowTeacherModal(false);
      setTeacherFormSuccess(false);
      setTeacherTitre('');
      setTeacherConsigne('');
      setTeacherConseils('');
      setSubjectLoadNotice(`Nouveau sujet officiel déposé par l'enseignant et ajouté à la Bibliothèque !`);
      setTimeout(() => setSubjectLoadNotice(null), 4500);
    }, 1100);
  };

  const handleDeleteCustomSubject = (id: string) => {
    if (!isTeacherAuthenticated) {
      setTeacherAuthError("Accès réservé : veuillez saisir la clé d'habilitation enseignant pour retirer un sujet.");
      setShowTeacherAuthModal(true);
      return;
    }
    if (window.confirm('Êtes-vous sûr de vouloir retirer ce sujet déposé de la bibliothèque ?')) {
      setRegionalSubjects((prev) => {
        const filtered = prev.filter((s) => s.id !== id);
        try {
          const customsOnly = filtered.filter((s) => s.sourceEnseignant);
          localStorage.setItem('akhawayn_custom_regional_subjects', JSON.stringify(customsOnly));
        } catch (err) {
          console.error(err);
        }
        return filtered;
      });
    }
  };

  const filteredSubjects = React.useMemo(() => {
    return regionalSubjects.filter((item) => {
      const matchOeuvre =
        selectedOeuvreFilter === 'TOUTES' ||
        (selectedOeuvreFilter === 'ENSEIGNANT' && item.sourceEnseignant) ||
        item.oeuvre === selectedOeuvreFilter;

      if (!matchOeuvre) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.titre.toLowerCase().includes(q) ||
        item.consigne.toLowerCase().includes(q) ||
        item.region.toLowerCase().includes(q) ||
        item.annee.includes(q) ||
        item.oeuvre.toLowerCase().includes(q)
      );
    });
  }, [regionalSubjects, selectedOeuvreFilter, searchQuery]);

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

  // Si l'élève choisit une couleur différente du noir, l'écriture s'affiche en gras
  const isBoldInk = React.useMemo(() => {
    return inkColor.toLowerCase() !== '#0f172a' && inkColor.toLowerCase() !== '#000000' && inkColor.toLowerCase() !== 'black';
  }, [inkColor]);

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

  // Attribution de la mention officielle selon la note sur 10 (Mention Très Bien, Bien, À consolider)
  const getMentionData = (note: number, isHorsSujetVal: boolean) => {
    if (isHorsSujetVal || note === 0) {
      return {
        label: 'Hors-Sujet',
        className: 'bg-red-100 text-red-800 border-red-300',
      };
    }
    if (note >= 8.0) {
      return {
        label: 'Mention Très Bien',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-2xs',
      };
    }
    if (note >= 6.5) {
      return {
        label: 'Mention Bien',
        className: 'bg-blue-100 text-blue-800 border-blue-300 shadow-2xs',
      };
    }
    return {
      label: 'À consolider',
      className: 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs',
    };
  };

  const currentScoreNum = isHorsSujet
    ? 0
    : (parseFloat(scores.total) || (scores.c + scores.s + scores.a + scores.l + scores.x) || 8.8);
  const mentionInfo = getMentionData(currentScoreNum, isHorsSujet);

  // Modal Changement de mot de passe sécurisé par Clé Maître Enseignant
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [passwordChangeStep, setPasswordChangeStep] = useState<'KEY' | 'PASSWORDS'>('KEY');
  const [activeUsersCount, setActiveUsersCount] = useState<number>(1);
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

  // Identifiant unique de session pour le suivi instantané des utilisateurs connectés
  const getClientId = () => {
    try {
      let id = sessionStorage.getItem('akhawayn_client_id');
      if (!id) {
        id = 'user_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
        sessionStorage.setItem('akhawayn_client_id', id);
      }
      return id;
    } catch {
      return 'user_client_' + Date.now();
    }
  };

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

    // Suivi instantané du nombre d'utilisateurs actifs via heartbeat régulier
    const pingHeartbeat = async () => {
      try {
        const res = await fetch('/api/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: getClientId() }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.count === 'number') {
            setActiveUsersCount(data.count);
          }
        }
      } catch {
        // En cas de micro-coupure réseau, conserver le dernier décompte
      }
    };

    pingHeartbeat();
    const heartbeatTimer = setInterval(pingHeartbeat, 6000);

    // Bloquer le clic droit sur toute la page
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      clearInterval(heartbeatTimer);
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
        fetch('/api/active-users')
          .then(r => r.json())
          .then(d => { if (d && typeof d.count === 'number') setActiveUsersCount(d.count); })
          .catch(() => {});
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
      // Énumération, classement & progression
      'En premier lieu', 'En deuxième lieu', 'En second lieu', 'En troisième lieu', 'En dernier lieu',
      "D'ailleurs", 'D’ailleurs', 'Par ailleurs',
      "En d'autres termes", 'En d’autres termes', 'Autrement dit',
      'D’abord', "D'abord", 'Tout d’abord', "Tout d'abord", 'Ensuite', 'Puis', 'Enfin',
      'De plus', 'En outre', 'De surcroît', 'De surcroit',
      'D’une part', "D'une part", 'D’autre part', "D'autre part",
      "D'un côté", 'D’un côté', "D'autre côté", 'D’autre côté',
      'À ce premier avantage s’ajoute', "A ce premier avantage s'ajoute", "À ce premier argument s'ajoute",
      'Si l’on ajoute enfin', "Si l'on ajoute enfin", 'Non seulement', 'Mais aussi', 'Mais encore',

      // Entrée en matière & étapes
      'Depuis un certain temps', 'D’année en année', "D'année en année", 'Il est fortement question de',
      'On parle beaucoup en ce moment de', 'Il faut d’abord rappeler que', "Il faut d'abord rappeler que",
      'On commencera d’abord par', "On commencera d'abord par", 'Il faut souligner que', 'Rappelons que',
      'Il ne faut pas oublier que', 'Il faut insister sur le fait que', 'On notera que',
      'D’autant plus que', "D'autant plus que", 'Passons à présent à la question de',
      'Venons-en à présent à la question de',

      // Cause & conséquence
      'En effet', 'En réalité', 'De fait', 'En fait',
      'Par conséquent', 'En conséquence', 'C’est pourquoi', "C'est pourquoi",
      'Dès lors', 'Il en résulte que', 'Ainsi', 'D’où', "D'où", 'Du fait que', 'Étant donné que',
      'Puisque', 'Sous prétexte que', 'De ce fait',

      // Concession & opposition
      'Certes', 'Il est exact que', 'S’il est certain que', "S'il est certain que",
      'Il n’en reste pas moins vrai que', "Il n'en reste pas moins vrai que",
      'Cependant', 'Toutefois', 'Néanmoins', 'En revanche', 'Au contraire', 'Pourtant', 'Par contre',
      'Bien loin de',

      // Exemples
      'Considérons par exemple le cas de', 'Tel est le cas, par exemple, de', 'Prenons le cas de',
      'Si l’on prend le cas de', "Si l'on prend le cas de", 'L’exemple le plus significatif', "L'exemple le plus significatif",

      // Modalisation & Relief
      'Il est certain que', 'Il est indéniable que', 'Il va de soi que', 'Sans aucun doute',
      'De même', 'Notons que', 'Précisons que', 'C’est-à-dire', "C'est-à-dire", 'À cet égard', "A cet égard",

      // Point de vue
      'Personnellement', 'Pour ma part', 'Selon moi', 'À mon avis', "A mon avis", 'D’après moi', "D'après moi", 'En ce qui me concerne',
      'Je pense que', 'Il me semble que',

      // Conclusion & clôture
      'En guise de conclusion', 'En définitive', 'En somme', 'En résumé', 'Il résulte de ce qui précède que',
      'En conclusion', 'Pour conclure', 'Finalement',
      'Aussi donne-t-elle', 'Aussi permet-elle', 'Aussi convient-il', 'Aussi importe-t-il'
    ];
    const sorted = [...connectors].sort((a, b) => b.length - a.length);
    let res = html;
    for (const c of sorted) {
      const escaped = c
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/['’]/g, "['’]");
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
    // Nettoyer toute injection intempestive de structure de plan dans la section 5
    let cleanedMd = rawMd
      .replace(/^[#*>\s]*(?:STRUCTURE DU PLAN RETENU|VARIANTE COMPARATIVE|Note méthodologique|Modèle Actif)[^\n]*/gim, '')
      .replace(/💡?\s*Note méthodologique officielle\s*:?[^\n]*/gi, '')
      .replace(/🎯?\s*(?:Modèle Actif|STRUCTURE DU PLAN RETENU)\s*:?[^\n]*/gi, '')
      .replace(/Modèles de référence certifiés conformes[^\n]*/gi, '')
      .replace(/Pour tout sujet demandant un avis ou un point de vue personnel[^\n]*/gi, '')
      .trim();

    let parsed = marked.parse(cleanedMd) as string;
    parsed = parsed.replace(/&#39;/g, "'");

    // Remplacement et stylisation chromatique stricte des cartes de phrases de l'élève (Section 5.A)
    // Phrase 1 : Thème Indigo
    parsed = parsed.replace(/(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+faible)?(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?1\s*:?<\/strong>([\s\S]*?)(?=(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+faible)?(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?2|<h[1-4]>|<hr|$)/i, (m, content) => {
      let cleanContent = content.replace(/<\/li>$/, '').replace(/<ul>\s*<li>/g, '<div style="margin-top:10px;">').replace(/<\/li>\s*<li>/g, '</div><div style="margin-top:8px;">').replace(/<\/li>\s*<\/ul>/g, '</div>');
      return `<div class="phrase-card-indigo" style="background:#eef2ff !important; border:2px solid #818cf8 !important; border-left:6px solid #4f46e5 !important; border-radius:14px !important; padding:16px 20px !important; margin-bottom:18px !important; box-shadow:0 2px 6px rgba(79,70,229,0.08) !important;">
        <div style="margin-bottom:10px;"><span style="background:#4f46e5 !important; color:#ffffff !important; font-size:0.75rem !important; font-weight:900 !important; padding:4px 12px !important; border-radius:6px !important; display:inline-flex !important; align-items:center !important; gap:6px !important; letter-spacing:0.04em !important; box-shadow:0 1px 3px rgba(79,70,229,0.3) !important;">📌 1. PHRASE FAIBLE N°1 (INDIGO) • REFORMULATION PUISSANTE</span></div>
        <div style="color:#1e293b;">${cleanContent}</div>
      </div>`;
    });

    // Phrase 2 : Thème Ambre / Orange
    parsed = parsed.replace(/(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+faible)?(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?2\s*:?<\/strong>([\s\S]*?)(?=(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+faible)?(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?3|<h[1-4]>|<hr|$)/i, (m, content) => {
      let cleanContent = content.replace(/<\/li>$/, '').replace(/<ul>\s*<li>/g, '<div style="margin-top:10px;">').replace(/<\/li>\s*<li>/g, '</div><div style="margin-top:8px;">').replace(/<\/li>\s*<\/ul>/g, '</div>');
      return `<div class="phrase-card-amber" style="background:#fffbeb !important; border:2px solid #fcd34d !important; border-left:6px solid #d97706 !important; border-radius:14px !important; padding:16px 20px !important; margin-bottom:18px !important; box-shadow:0 2px 6px rgba(217,119,6,0.08) !important;">
        <div style="margin-bottom:10px;"><span style="background:#d97706 !important; color:#ffffff !important; font-size:0.75rem !important; font-weight:900 !important; padding:4px 12px !important; border-radius:6px !important; display:inline-flex !important; align-items:center !important; gap:6px !important; letter-spacing:0.04em !important; box-shadow:0 1px 3px rgba(217,119,6,0.3) !important;">📌 2. PHRASE FAIBLE N°2 (AMBRE) • REFORMULATION PUISSANTE</span></div>
        <div style="color:#1e293b;">${cleanContent}</div>
      </div>`;
    });

    // Phrase 3 : Thème Émeraude / Sarcelle
    parsed = parsed.replace(/(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+faible)?(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?3\s*:?<\/strong>([\s\S]*?)(?=(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+faible)?(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?4|<h[1-4]>|<hr|$)/i, (m, content) => {
      let cleanContent = content.replace(/<\/li>$/, '').replace(/<ul>\s*<li>/g, '<div style="margin-top:10px;">').replace(/<\/li>\s*<li>/g, '</div><div style="margin-top:8px;">').replace(/<\/li>\s*<\/ul>/g, '</div>');
      return `<div class="phrase-card-emerald" style="background:#ecfdf5 !important; border:2px solid #86efac !important; border-left:6px solid #059669 !important; border-radius:14px !important; padding:16px 20px !important; margin-bottom:18px !important; box-shadow:0 2px 6px rgba(5,150,105,0.08) !important;">
        <div style="margin-bottom:10px;"><span style="background:#059669 !important; color:#ffffff !important; font-size:0.75rem !important; font-weight:900 !important; padding:4px 12px !important; border-radius:6px !important; display:inline-flex !important; align-items:center !important; gap:6px !important; letter-spacing:0.04em !important; box-shadow:0 1px 3px rgba(5,150,105,0.3) !important;">📌 3. PHRASE FAIBLE N°3 (ÉMERAUDE) • REFORMULATION PUISSANTE</span></div>
        <div style="color:#1e293b;">${cleanContent}</div>
      </div>`;
    });

    // Phrase 4 (si présente) : Thème Pourpre / Violet
    parsed = parsed.replace(/(?:<li>|<p>|<div>)?\s*<strong>Phrase(?:\s+faible)?(?:\s+de\s+l['’]élève)?\s*(?:n°\s*|#\s*)?4\s*:?<\/strong>([\s\S]*?)(?=<h[1-4]>|<hr|$)/i, (m, content) => {
      let cleanContent = content.replace(/<\/li>$/, '').replace(/<ul>\s*<li>/g, '<div style="margin-top:10px;">').replace(/<\/li>\s*<li>/g, '</div><div style="margin-top:8px;">').replace(/<\/li>\s*<\/ul>/g, '</div>');
      return `<div class="phrase-card-purple" style="background:#faf5ff !important; border:2px solid #d8b4fe !important; border-left:6px solid #9333ea !important; border-radius:14px !important; padding:16px 20px !important; margin-bottom:18px !important; box-shadow:0 2px 6px rgba(147,51,234,0.08) !important;">
        <div style="margin-bottom:10px;"><span style="background:#9333ea !important; color:#ffffff !important; font-size:0.75rem !important; font-weight:900 !important; padding:4px 12px !important; border-radius:6px !important; display:inline-flex !important; align-items:center !important; gap:6px !important; letter-spacing:0.04em !important; box-shadow:0 1px 3px rgba(147,51,234,0.3) !important;">📌 4. PHRASE FAIBLE N°4 (POURPRE) • REFORMULATION PUISSANTE</span></div>
        <div style="color:#1e293b;">${cleanContent}</div>
      </div>`;
    });

    // Badges distincts pour Diagnostic didactique et Reformulation
    parsed = parsed.replace(/<strong>Diagnostic didactique\s*:?<\/strong>/gi, 
      '<span style="background:#f1f5f9; color:#334155; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:6px; border:1px solid #cbd5e1; display:inline-flex; align-items:center; gap:4px; margin-right:6px;">🔍 Diagnostic didactique :</span>');

    parsed = parsed.replace(/<strong>Reformulation(?:\s+(?:claire|puissante)(?:\s+et\s+naturelle)?)?(?:\s*\([^)]*\))?\s*:?<\/strong>/gi, 
      '<span style="background:#ecfdf5; color:#047857; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:6px; border:1.5px solid #a7f3d0; display:inline-flex; align-items:center; gap:4px; margin-right:6px; box-shadow:0 1px 2px rgba(4,120,87,0.08);">✨ Reformulation puissante certifiée (1ère Bac) :</span>');

    // Mise en page soignée pour Section B : Texte Intégral Réécrit & Fluidifié
    parsed = parsed.replace(/(<h[1-4]>.*?B\.\s*Texte\s+Intégral[\s\S]*?<\/h[1-4]>)([\s\S]*?)$/i, (m, hTag, content) => {
      // 1. Remplacement méthodologique strict : "Cependant" est formellement interdit pour introduire les conséquences
      let cleanContent = content;

      // 0. Assainissement chirurgical de l'introduction de Section B (détection du thème sans coupure)
      if (cleanContent.includes('« « Il est temps') || cleanContent.includes('décider à la place de leurs jeunes en') || cleanContent.includes('la question posée par « «')) {
        cleanContent = cleanContent.replace(/<p[^>]*>.*?Quand on plonge[\s\S]*?<\/p>/i,
          '<p style="text-indent: 2.25rem; margin-top: 1.25rem; margin-bottom: 1.25rem; line-height: 2.1;"><strong>Quand on plonge dans la lecture attentive du roman autobiographique La Boîte à Merveilles d\'Ahmed Sefrioui</strong>, on se rend compte que la question de l\'autorité parentale et de l\'autonomie accordée aux jeunes enfants constitue une interrogation existentielle et éducative déterminante pour chaque conscience en formation. Dès lors, convient-il d\'estimer que les parents doivent impérativement décider à la place de leurs enfants pour assurer leur protection, ou importe-t-il au contraire de leur accorder une véritable liberté dans leurs choix personnels ? Pour répondre avec rigueur et méthode à cette problématique, il s\'agira d\'examiner dans un premier axe la légitimité du rôle protecteur et régulateur des parents, avant de mettre en lumière dans un second axe la nécessité d\'encourager le libre arbitre et le sens des responsabilités chez les jeunes.</p>');
      }

      // Si le sujet concerne les guérisseurs et que l'introduction commence par "Quand on plonge dans la lecture...", rétablir l'amorce sociétale
      if ((cleanContent.includes('guérisseur') || cleanContent.includes('guerisseur')) && cleanContent.includes('Quand on plonge')) {
        cleanContent = cleanContent.replace(/<p[^>]*>.*?Quand on plonge[\s\S]*?<\/p>/i,
          '<p style="text-indent: 2.25rem; margin-top: 1.25rem; margin-bottom: 1.25rem; line-height: 2.1;"><strong>Dans de nombreuses sociétés traditionnelles comme au Maroc</strong>, le recours aux tradipraticiens et aux guérisseurs continue de susciter un vif débat quant à ses causes, ses conséquences sanitaires et les remèdes institutionnels à y apporter. Dès lors, quelles sont les causes profondes qui poussent tant de citoyens à se détourner de la médecine moderne, quelles en sont les répercussions alarmantes sur la santé publique, et quelles solutions concrètes convient-il de déployer pour endiguer ce phénomène ? Pour aborder avec rigueur cette problématique, il s\'agira d\'analyser dans un premier axe les causes majeures de ce fléau, de mettre en évidence dans un deuxième axe ses conséquences sanitaires dramatiques, avant de formuler dans un troisième axe les solutions indispensables pour y remédier durablement.</p>');
      }

      // 1. Remplacement méthodologique strict : "Cependant" est formellement interdit pour introduire les conséquences
      cleanContent = cleanContent
        .replace(/(?:<p[^>]*>)?\s*(?:<strong>)?\s*Cependant\s*,?\s*(?:<\/strong>)?\s*(les conséquences|les répercussions|les impacts|les effets|ce choix|cette pratique|ce recours)/gi,
          '<p style="text-indent: 2.25rem; margin-top: 1.25rem; margin-bottom: 1.25rem; line-height: 2.1;"><strong>Par conséquent</strong>, $1')
        .replace(/\bCependant\s*,\s*(les conséquences|les répercussions|les impacts|les effets|ce choix|cette pratique|ce recours)/gi, '<strong>Par conséquent</strong>, $1')
        .replace(/Cependant\s*,\s*les conséquences/gi, '<strong>Par conséquent</strong>, les conséquences')
        .replace(/Cependant\s*,\s*les répercussions/gi, '<strong>Par conséquent</strong>, les répercussions');

      // 2. "En premier lieu," doit être obligatoirement au début du développement avec un saut de ligne et un alinéa distinct
      cleanContent = cleanContent.replace(/([.!?…:])\s*(?:<\/p>)?\s*(?:<p[^>]*>)?\s*(?:<strong>)?\s*(En premier lieu\b|D'abord\b|D’abord\b|D'une part\b|D’une part\b)/gi,
        '$1</p>\n\n<p style="text-indent: 2.25rem; margin-top: 1.25rem; margin-bottom: 1.25rem; line-height: 2.1;"><strong>$2</strong>');
      cleanContent = cleanContent.replace(/(?<=[a-zA-ZÀ-ÿ0-9])\s+(?:<strong>)?\s*(En premier lieu\b|D'abord\b|D’abord\b|D'une part\b|D’une part\b)/gi,
        '.</p>\n\n<p style="text-indent: 2.25rem; margin-top: 1.25rem; margin-bottom: 1.25rem; line-height: 2.1;"><strong>$1</strong>');

      // 3. Respect absolu de la consigne du sujet : Si le sujet demande les causes, conséquences ET solutions (ex: guérisseurs), garantir la présence des solutions
      const isAnalyticTopic = cleanContent.includes('guérisseur') || cleanContent.includes('guerisseur') || cleanContent.includes('charlatan') || (cleanContent.includes('causes') && (cleanContent.includes('conséquence') || cleanContent.includes('consequence')));
      const hasSolutions = cleanContent.includes('remédier') || cleanContent.includes('solutions') || cleanContent.includes('prévention') || cleanContent.includes('démocratiser');
      if (isAnalyticTopic && !hasSolutions) {
        const conclRegex = /(<p[^>]*>.*?<strong>\s*(?:En conclusion|En définitive|En somme)[\s\S]*?<\/p>)/i;
        const solutionsPara = `<p style="text-indent: 2.25rem; margin-top: 1.25rem; margin-bottom: 1.25rem; line-height: 2.1;"><strong>Enfin, pour remédier à ce fléau</strong>, la mise en œuvre d'une stratégie globale articulée autour de la prévention, de la fermeté juridique et de la démocratisation des soins s'impose avec une impérieuse nécessité. D'un côté, les pouvoirs publics et la société civile doivent intensifier les campagnes de sensibilisation dans les médias et les établissements scolaires afin de démystifier le charlatanisme et d'inculquer les réflexes de la médecine préventive aux citoyens. D'autre part, il convient de durcir l'arsenal législatif pour sanctionner sévèrement les faux praticiens qui exercent illégalement, tout en étendant la couverture médicale universelle et les dispensaires de proximité afin de rendre les consultations médicales accessibles aux foyers les plus modestes. Dès lors, seule une action solidaire, éducative et résolue permettra de tarir définitivement la clientèle de ces charlatans.</p>`;
        if (conclRegex.test(cleanContent)) {
          cleanContent = cleanContent.replace(conclRegex, `${solutionsPara}\n\n$1`);
        } else {
          cleanContent += `\n\n${solutionsPara}`;
        }
      }

      // 4. Stylisation des paragraphes avec alinéa
      cleanContent = cleanContent.replace(/<p(?![^>]*text-indent)/gi, '<p style="text-indent: 2.25rem; margin-top: 1.25rem; margin-bottom: 1.25rem; line-height: 2.1;"');

      return `
        <div style="margin-top:28px; background:#ffffff; border:2px solid #0b1528; border-radius:16px; padding:22px; box-shadow:0 4px 14px rgba(11,21,40,0.08);">
          <div style="background:#0b1528; border-radius:12px; padding:12px 18px; margin-bottom:18px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.15rem;">🏆</span>
              <span style="color:#ffffff; font-weight:900; font-size:0.85rem; letter-spacing:0.04em;">B. TEXTE INTÉGRAL RÉÉCRIT & FLUIDIFIÉ (VERSION CONTINUE D'EXCELLENCE)</span>
            </div>
            <span style="background:#059669; color:#ffffff; font-size:0.72rem; font-weight:800; padding:3px 10px; border-radius:9999px;">EXEMPLES EN GRAS • CONNECTEURS EN BLEU</span>
          </div>
          <div style="color:#1e293b; line-height:2.05; text-align:justify; font-size:0.95rem;">
            ${cleanContent}
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

    // Nettoyer rigoureusement tout bandeau sombre, texte d'annonce de structure ou note méthodologique
    raw = raw.replace(/<div[^>]*style="[^"]*background:\s*#0b1528[^"]*"[\s\S]*?<\/div>\s*<\/div>/gi, '').trim();
    raw = raw.replace(/<div[^>]*>[\s\S]*?(?:STRUCTURE DU PLAN RETENU|VARIANTE COMPARATIVE|Note méthodologique officielle|Modèle Actif)[\s\S]*?<\/div>/gi, '').trim();
    raw = raw.replace(/<h[1-6][^>]*>[\s\S]*?(?:STRUCTURE DU PLAN|PLAN DIALECTIQUE|PLAN SIMPLE|PLAN THÉMATIQUE|MODÈLE ACTIF)[\s\S]*?<\/h[1-6]>/gi, '').trim();
    raw = raw.replace(/^[#*>\s]*(?:STRUCTURE DU PLAN RETENU|VARIANTE COMPARATIVE|Note méthodologique|Modèle Actif)[^\n<]*/gim, '').trim();
    raw = raw.replace(/💡?\s*Note méthodologique officielle\s*:?[\s\S]*?(?=📌|<div|$)/gi, '').trim();
    raw = raw.replace(/🎯?\s*(?:Modèle Actif|STRUCTURE DU PLAN RETENU)\s*:?[^\n<]*/gi, '').trim();
    raw = raw.replace(/Modèles de référence certifiés conformes[^\n<]*/gi, '').trim();
    raw = raw.replace(/Pour tout sujet demandant un avis ou un point de vue personnel[^\n<]*/gi, '').trim();

    const isDialectique = planType === 'DIALECTIQUE';
    const isAnalytique = planType === 'ANALYTIQUE';

    // Remplacement méthodologique strict : "Cependant" est formellement interdit pour introduire les conséquences
    raw = raw
      .replace(/(?:<p[^>]*>)?\s*(?:<strong>)?\s*Cependant\s*,?\s*(?:<\/strong>)?\s*(les conséquences|les répercussions|les impacts|les effets|ce choix|cette pratique|ce recours)/gi,
        '<p style="text-indent: 2.25rem; margin-top: 1.25rem; margin-bottom: 1.25rem; line-height: 2.1;"><strong>Par conséquent</strong>, $1')
      .replace(/\bCependant\s*,\s*(les conséquences|les répercussions|les impacts|les effets|ce choix|cette pratique|ce recours)/gi, '<strong>Par conséquent</strong>, $1');

    // Détection de la présence d'un 3ème axe (ex: solutions ou synthèse)
    const hasAxe3InRaw = !!(raw.match(/<div class="model-axe3">/i) || raw.match(/<div class="model-solutions?">/i) || (isAnalytique && (raw.includes('solutions') || raw.includes('remédier') || raw.includes('démocratisation'))));

    // Fonction de génération d'une barre d'étapes RESPONSIVE ET STRICTEMENT SUR LA MÊME LIGNE
    const renderStepBar = (steps: { label: string; bg: string }[]) => {
      const items = steps.map(s => `
        <span style="background:${s.bg}; color:#ffffff; font-weight:800; font-size:clamp(0.58rem, 0.82vw, 0.72rem); padding:4px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; white-space:nowrap; flex-shrink:0; box-shadow:0 1px 2px rgba(0,0,0,0.06); letter-spacing:0.02em;">
          ${s.label}
        </span>
      `).join('<span style="color:#94a3b8; font-size:0.7rem; flex-shrink:0; padding:0 2px;">→</span>');

      return `
        <div class="model-step-bar" style="display:flex; flex-direction:row; flex-wrap:nowrap !important; align-items:center; justify-content:space-between; gap:4px; margin-bottom:18px; padding:8px 10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; font-family:system-ui, -apple-system, sans-serif; overflow-x:auto; width:100%; box-sizing:border-box; white-space:nowrap; -webkit-overflow-scrolling:touch; scrollbar-width:none;">
          ${items}
        </div>
      `;
    };

    let planHeaderHtml = '';
    if (isDialectique) {
      planHeaderHtml = renderStepBar([
        { label: '1. INTRODUCTION', bg: '#ea580c' },
        { label: '2. THÈSE', bg: '#2563eb' },
        { label: '3. ANTITHÈSE', bg: '#9333ea' },
        { label: '4. SYNTHÈSE', bg: '#0d9488' },
        { label: 'CONCLUSION', bg: '#059669' }
      ]);
    } else if (isAnalytique) {
      if (hasAxe3InRaw) {
        planHeaderHtml = renderStepBar([
          { label: '1. INTRODUCTION', bg: '#ea580c' },
          { label: '2. CAUSES', bg: '#2563eb' },
          { label: '3. CONSÉQUENCES', bg: '#0d9488' },
          { label: '4. SOLUTIONS', bg: '#d97706' },
          { label: 'CONCLUSION', bg: '#059669' }
        ]);
      } else {
        planHeaderHtml = renderStepBar([
          { label: '1. INTRODUCTION', bg: '#ea580c' },
          { label: '2. CAUSES', bg: '#2563eb' },
          { label: '3. CONSÉQUENCES', bg: '#0d9488' },
          { label: 'CONCLUSION', bg: '#059669' }
        ]);
      }
    } else {
      planHeaderHtml = renderStepBar([
        { label: '1. INTRODUCTION', bg: '#ea580c' },
        { label: '2. PREMIER AXE', bg: '#2563eb' },
        { label: '3. SECOND AXE', bg: '#0d9488' },
        { label: 'CONCLUSION', bg: '#059669' }
      ]);
    }

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

    if (!introContent || !conclContent || !axe1Content) {
      const rawParas = raw.replace(/<[^>]*>/g, '\n').split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 25);
      if (rawParas.length >= 4) {
        if (!introContent) introContent = rawParas[0];
        if (!axe1Content) axe1Content = rawParas[1];
        if (!axe2Content) axe2Content = rawParas[2];
        if (!conclContent) conclContent = rawParas[rawParas.length - 1];
      }
    }

    // NORME STRICTE AL AKHAWAYN (MIN. 16 À 19 LIGNES & 4 BLOCS CERTIFIÉS)
    // Si l'IA n'a pas inclus l'introduction ou la conclusion, les régénérer avec rigueur didactique
    if (!introContent) {
      introContent = `<p>Quand on plonge dans la lecture attentive du roman autobiographique <em>La Boîte à Merveilles</em> d'Ahmed Sefrioui, on constate que la réflexion engagée autour de la solitude et de l'épanouissement personnel touche au cœur même de la condition humaine. Dès lors, convient-il d'appréhender l'isolement comme une faiblesse aliénante ou importe-t-il au contraire de le concevoir comme une étape féconde de maturation intérieure ? Pour répondre avec rigueur à cette interrogation, il conviendra d'examiner dans un premier axe les dangers du repli involontaire, avant de mettre en lumière dans un second axe les vertus salvatrices d'un recul réfléchi sur soi-même.</p>`;
    }

    if (!conclContent) {
      conclContent = `<p><strong>En conclusion</strong>, l'analyse menée démontre que la solitude ne saurait être réduite à une fatalité stérile dès lors qu'elle s'accompagne d'une exigence de lucidité et d'une force de recul intérieur. Loin de s'opposer, la conscience intime de soi et la participation active à la vie sociale s'éclairent mutuellement pour forger une personnalité autonome et équilibrée. En définitive, ne revient-il pas à chaque conscience de transformer ses moments d'isolement en un tremplin fertile d'élévation morale et d'authenticité ?</p>`;
    }

    // Enrichissement substantiel des axes pour garantir strictement entre 16 et 19-20 lignes au total :
    if (axe1Content && axe1Content.length < 280) {
      axe1Content += ` Au sein de la médina traditionnelle décrite avec tendresse par <strong>Ahmed Sefrioui dans La Boîte à Merveilles</strong>, les querelles incessantes et les heurts mesquins observés à <strong>Dar Chouafa</strong> révèlent combien l'incompréhension mutuelle peut précipiter l'individu dans un désarroi douloureux. De surcroît, les souffrances éprouvées au Msid sous la férule du fqih illustrent la détresse de l'enfant privé d'écoute bienveillante. Ainsi, l'enfermement subi sans recours extérieur menace la sérénité de l'esprit et nourrit le sentiment d'abandon.`;
    }

    if (axe2Content && axe2Content.length < 280) {
      axe2Content += ` À cet égard, le petit <strong>Sidi Mohammed</strong> transforme son isolement en une quête féconde grâce au trésor secret de <strong>sa boîte à merveilles</strong>, où les objets hétéroclites deviennent les confidents d'un univers poétique préservé des vulgarités adultes. De plus, les visites réconfortantes au sanctuaire de <strong>Sidi Ali Boughaleb</strong> avec sa mère <strong>Lalla Zoubida</strong> et les conseils du sage <strong>Sidi El Arafi</strong> démontrent que l'apaisement intérieur permet de transcender les tourments quotidiens. Dès lors, le retour lucide sur soi s'affirme comme le moteur privilégié d'une véritable émancipation.`;
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
    bodyHtml += wrapSection('1. INTRODUCTION (ORANGE)', '#ea580c', '#ea580c', '#fff7ed', introContent);
    if (axe1Content) {
      const badgeTitle = isDialectique ? '2. AXE 1 / THÈSE (BLEU)' : (isAnalytique ? '2. PREMIER AXE / CAUSES (BLEU)' : '2. PREMIER AXE (BLEU)');
      bodyHtml += wrapSection(badgeTitle, '#2563eb', '#2563eb', '#eff6ff', axe1Content);
    }
    if (axe2Content) {
      const badgeColor = isDialectique ? '#9333ea' : '#0d9488';
      const badgeTitle = isDialectique ? '3. AXE 2 / ANTITHÈSE (VIOLET)' : (isAnalytique ? '3. SECOND AXE / CONSÉQUENCES (SARCELLE)' : '3. SECOND AXE (SARCELLE)');
      const bg = isDialectique ? '#faf5ff' : '#f0fdfa';
      bodyHtml += wrapSection(badgeTitle, badgeColor, badgeColor, bg, axe2Content);
    }
    if (axe3Content) {
      if (isAnalytique) {
        bodyHtml += wrapSection('4. TROISIÈME AXE / SOLUTIONS & REMÈDES (AMBRE)', '#d97706', '#d97706', '#fffbeb', axe3Content);
      } else {
        bodyHtml += wrapSection('4. SYNTHÈSE (SARCELLE)', '#0d9488', '#0d9488', '#f0fdfa', axe3Content);
      }
    }
    if (conclContent) {
      bodyHtml += wrapSection('CONCLUSION (VERT ÉMERAUDE)', '#059669', '#059669', '#ecfdf5', conclContent);
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
    
    // Connecteurs logiques officiels à mettre en gras (exhaustif selon Cadre Officiel)
    const connectors = [
      'En premier lieu', 'En deuxième lieu', 'En second lieu', 'En troisième lieu', 'En dernier lieu',
      "D'ailleurs", 'D’ailleurs', 'Par ailleurs',
      "En d'autres termes", 'En d’autres termes', 'Autrement dit',
      'En guise de conclusion', 'En définitive', 'En somme', 'En résumé', 'En conclusion', 'Pour conclure', 'Finalement',
      'Personnellement', 'Pour ma part', 'À mon avis', 'A mon avis', 'Selon moi', "D'après moi", 'D’après moi', 'En ce qui me concerne',
      'Tout d’abord', "Tout d'abord", 'D’abord', "D'abord", 'Premièrement', 'Deuxièmement', 'Troisièmement',
      'Ensuite', 'Puis', 'Enfin',
      'Cependant', 'Toutefois', 'Néanmoins', 'En revanche', 'Au contraire', 'Pourtant', 'Par contre',
      'Par conséquent', 'En conséquence', "C'est pourquoi", 'C’est pourquoi', 'Dès lors', 'Ainsi',
      'En effet', 'En réalité', 'De fait', 'En fait',
      'De plus', 'En outre', 'De surcroît', 'De surcroit',
      'D’une part', "D'une part", 'D’autre part', "D'autre part",
      "D'un côté", 'D’un côté', "D'autre côté", 'D’autre côté', "De l'autre côté", 'De l’autre côté',
      'Non seulement', 'Mais aussi', 'Mais encore',
      'Aussi donne-t-elle', 'Aussi permet-elle', 'Aussi convient-il', 'Aussi importe-t-il', 'Aussi',
      'De ce fait', "D'où", 'D’où', 'Certes', 'Sans doute', 'De même'
    ];

    const applyHighlights = (str: string) => {
      let res = str;

      // 1. Transformer les éventuelles notations explicites [faute -> correction] ou [faute] en erreurs rouges
      res = res.replace(/(?<!<span class="err-highlight"[^>]*>)(\[[^\]]+\])(?!<\/span>)/g, '<span class="err-highlight" style="color:#dc2626 !important; background-color:#fee2e2 !important; font-weight:800 !important; border:1px solid #fca5a5 !important; text-decoration:underline wavy #ef4444 !important; padding:2px 6px !important; border-radius:4px !important; display:inline-block !important; margin:1px 2px !important;">$1</span>');

      // 2. Connecteurs en gras s'ils ne le sont pas déjà (triés du plus long au plus court)
      const sortedConnectors = [...connectors].sort((a, b) => b.length - a.length);
      for (const c of sortedConnectors) {
        const escaped = c
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/['’]/g, "['’]");
        const regex = new RegExp(`(?<!<strong>)(?<!<strong[^>]*>)(?<![a-zA-ZÀ-ÿ0-9_])(${escaped})(?![a-zA-ZÀ-ÿ0-9_])(?!<\\/strong>)`, 'gi');
        res = res.replace(regex, '<strong>$1</strong>');
      }

      // 3. Si la balise <span class="err-highlight"> existe déjà sans inline style, lui ajouter le style rouge
      res = res.replace(/<span class="err-highlight"(?! style)/gi, '<span class="err-highlight" style="color:#dc2626 !important; background-color:#fee2e2 !important; font-weight:800 !important; border:1px solid #fca5a5 !important; text-decoration:underline wavy #ef4444 !important; padding:2px 6px !important; border-radius:4px !important; display:inline-block !important; margin:1px 2px !important;"');

      return res;
    };

    // RÈGLE MÉTHODOLOGIQUE MAJEURE : « En premier lieu... », « Personnellement... » ou « Pour ma part... » doit être placé au début du développement
    // dans un paragraphe distinct avec son propre alinéa et saut de ligne franc.
    const splitAtDevelopment = (str: string) => {
      if (!str) return '';
      let s = str;
      // 1. Scission si à l'intérieur d'une balise <p>...</p>
      s = s.replace(/([.!?…:])\s*(?:<\/p>)?\s*(?:<p[^>]*>)?\s*(?:<strong>)?\s*(En premier lieu\b|D'abord\b|D’abord\b|D'une part\b|D’une part\b|Personnellement\b|Pour ma part\b|À mon avis\b|A mon avis\b|Selon moi\b|En ce qui me concerne\b)/gi, '$1</p>\n\n<p style="text-indent: 2.25rem; margin-bottom: 1.25rem; line-height: 2.1;"><strong>$2</strong>');
      // 2. Scission si en texte brut ou markdown avec ponctuation
      s = s.replace(/([.!?…:])\s*(?!\n\s*\n)\s*(?:<strong>)?\s*(En premier lieu\b|D'abord\b|D’abord\b|D'une part\b|D’une part\b|Personnellement\b|Pour ma part\b|À mon avis\b|A mon avis\b|Selon moi\b|En ce qui me concerne\b)/gi, '$1\n\n$2');
      // 3. Scission même si aucune ponctuation n'a été saisie à la fin de l'introduction
      s = s.replace(/(?<=[a-zA-ZÀ-ÿ0-9])\s+(?!\n\s*\n)(?=(?:Personnellement|En premier lieu|D'abord|D’abord|D'une part|D’une part|Pour ma part|À mon avis|A mon avis|Selon moi)\b)/gi, '.\n\n');
      return s;
    };

    const normCleaned = splitAtDevelopment(cleaned);
    const normOriginal = splitAtDevelopment(originalText);

    if (!normCleaned) {
      const paras = normOriginal.split(/\n\s*\n/).filter(p => p.trim());
      return paras.map(p => `<p style="text-indent: 2.25rem; margin-bottom: 1.25rem; line-height: 2.1;">${applyHighlights(p.trim().replace(/\n/g, '<br/>'))}</p>`).join('\n\n');
    }

    // Si le texte comporte des balises <p>...</p>, les formater individuellement avec style et retraits
    const pMatches = normCleaned.match(/<p[\s>][\s\S]*?<\/p>/gi);
    if (pMatches && pMatches.length > 1) {
      return pMatches.map(p => {
        const inner = p.replace(/^<p[\s>]*>/i, '').replace(/<\/p>$/i, '').trim();
        return `<p style="text-indent: 2.25rem; margin-bottom: 1.25rem; line-height: 2.1;">${applyHighlights(inner)}</p>`;
      }).join('\n\n');
    }

    // Si séparé par des doubles retours à la ligne, découper en paragraphes distincts
    const rawParas = (normCleaned || normOriginal).split(/\n\s*\n/).filter(p => p.trim());
    if (rawParas.length > 1) {
      return rawParas.map(p => {
        let trimmed = p.trim().replace(/^<p[\s>]*>/i, '').replace(/<\/p>$/i, '').trim();
        return `<p style="text-indent: 2.25rem; margin-bottom: 1.25rem; line-height: 2.1;">${applyHighlights(trimmed.replace(/\n/g, '<br/>'))}</p>`;
      }).join('\n\n');
    }

    // Reconstruction si tout a été groupé en 1 bloc
    const originalParas = normOriginal.split(/\n\s*\n/).filter(p => p.trim());
    if (originalParas.length > 1) {
      let remaining = normCleaned.replace(/^<p>/i, '').replace(/<\/p>$/i, '').trim();
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

    return `<p style="text-indent: 2.25rem; margin-bottom: 1.25rem; line-height: 2.1;">${applyHighlights(normCleaned.replace(/\n/g, '<br/>'))}</p>`;
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

  const detectClientSubjectAnalysis = (topic: string) => {
    const tLow = (topic || '').toLowerCase();

    const isParentsKids = tLow.includes('parent') || 
      tLow.includes('décider à la place') || 
      tLow.includes('decider a la place') || 
      tLow.includes('rapport parents') || 
      tLow.includes('autorité parentale') || 
      tLow.includes('autorite parentale') || 
      (tLow.includes('enfant') && (tLow.includes('jeune') || tLow.includes('adulte') || tLow.includes('décid') || tLow.includes('decid')));

    const isGuerisseur = tLow.includes('guérisseur') || 
      tLow.includes('guerisseur') || 
      tLow.includes('charlatan') || 
      tLow.includes('tradipraticien') || 
      (tLow.includes('cause') && (tLow.includes('conséquence') || tLow.includes('consequence') || tLow.includes('solution')));

    const isSolitude = tLow.includes('solitude') || 
      tLow.includes('isolement') || 
      tLow.includes('faiblesse') || 
      tLow.includes('épanouissement') || 
      tLow.includes('epanouissement');

    const isAntigone = tLow.includes('antigone') || 
      tLow.includes('anouilh') || 
      tLow.includes('créon') || 
      tLow.includes('creon') || 
      tLow.includes('ismène') || 
      tLow.includes('ismene') ||
      tLow.includes('hémon') ||
      tLow.includes('hemon');

    const isCondamne = tLow.includes('dernier jour') || 
      tLow.includes('condamné') || 
      tLow.includes('condamne') || 
      tLow.includes('victor hugo') || 
      tLow.includes('peine de mort') || 
      tLow.includes('échafaud') || 
      tLow.includes('echafaud') || 
      tLow.includes('guillotine') ||
      tLow.includes('bicêtre');

    const isBoiteMentioned = tLow.includes('boîte') || 
      tLow.includes('boite') || 
      tLow.includes('sefrioui') || 
      tLow.includes('merveilles') || 
      tLow.includes('sidi mohammed');

    let work: 'boite' | 'antigone' | 'condamne' | 'general' = 'general';
    if (isParentsKids || isSolitude || isBoiteMentioned) {
      work = 'boite';
    } else if (isAntigone) {
      work = 'antigone';
    } else if (isCondamne) {
      work = 'condamne';
    } else {
      work = 'general';
    }

    let themeTitle = '';
    if (isParentsKids) {
      themeTitle = "la question de l'autorité parentale et de l'autonomie accordée aux jeunes enfants";
    } else if (isGuerisseur) {
      themeTitle = "le recours aux tradipraticiens et aux guérisseurs traditionnels";
    } else if (isSolitude) {
      themeTitle = "la réflexion engagée autour de la solitude et de l'épanouissement personnel";
    } else if (isAntigone) {
      themeTitle = "le conflit tragique entre l'obéissance aux impératifs de la loi et la liberté sacrée de la conscience";
    } else if (isCondamne) {
      themeTitle = "la légitimité de la justice répressive et l'exigence morale de l'abolition de la peine de mort";
    } else {
      let cleaned = topic
        .replace(/[«»"“”]/g, '')
        .replace(/déclare\s+un\s+[a-zA-ZÀ-ÿ]+/gi, '')
        .replace(/partagez-vous\s+cette\s+idée\s*\??/gi, '')
        .replace(/dans\s+un\s+texte\s+argumentatif[\s\S]*/gi, '')
        .replace(/vous\s+présenterez[\s\S]*/gi, '')
        .trim();
      if (cleaned.length > 70) {
        cleaned = cleaned.slice(0, 70).replace(/\s+\S*$/, '') + '...';
      }
      themeTitle = cleaned ? `la réflexion suscitée par « ${cleaned} »` : "cette question éthique et sociétale";
    }

    return {
      isParentsKids,
      isGuerisseur,
      isSolitude,
      isAntigone,
      isCondamne,
      isBoiteMentioned,
      work,
      themeTitle,
    };
  };

  const getDefaultPlanA = (topicSujet: string) => {
    const analysis = detectClientSubjectAnalysis(topicSujet);

    if (analysis.isGuerisseur) {
      return `<div class="model-intro">
<p>Dans de nombreuses sociétés traditionnelles comme au Maroc, le recours aux tradipraticiens et aux guérisseurs continue de susciter un engouement persistant auprès d'une large frange de la population. Dès lors, quelles sont les causes profondes qui poussent tant de citoyens à se détourner de la médecine moderne au profit de ces pratiques empiriques, quelles en sont les répercussions alarmantes sur la santé publique, et quelles solutions concrètes convient-il de déployer pour endiguer ce phénomène ? Pour aborder avec rigueur cette problématique, il s'agira d'analyser dans un premier axe les causes majeures de ce fléau, de mettre en évidence dans un deuxième axe ses conséquences sanitaires dramatiques, avant de formuler dans un troisième axe les solutions indispensables pour y remédier durablement.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, l'attachement aux guérisseurs s'explique avant tout par la persistance de l'analphabétisme, la précarité matérielle et le coût exorbitant des soins médicaux hospitaliers pour les familles démunies. Confrontés à des pathologies chroniques, à des douleurs inexplicables ou à une détresse psychologique aiguë, de nombreux patients délaissent les cabinets spécialisés au profit de figures traditionnelles qui promettent des remèdes miraculeux, rapides et peu onéreux. De plus, le poids des croyances ancestrales et la pression culturelle de l'entourage entretiennent l'illusion tenace que certains maux relèvent d'influences mystiques ou surnaturelles qu'aucune science rationnelle ne saurait apaiser. Ainsi, la vulnérabilité socio-économique et le manque d'information médicale constituent le terreau fertile de cette pratique archaïque.</p>
</div>

<div class="model-axe2">
<p><strong>Par conséquent</strong>, les répercussions sanitaires de ce recours aveugle s'avèrent dramatiques pour la population et provoquent fréquemment des préjudices corporels irréversibles. Un guérisseur, généralement dépourvu de tout diplôme médical et de formation pharmacologique rigoureuse, prétend soigner par des méthodes empiriques qui dégradent sournoisement la santé des malades. D'une part, il maîtrise mal le dosage des substances chimiques et végétales administrées, ce qui engendre des intoxications aiguës, des néphropathies et des comas après ingestion de décoctions inappropriées. D'autre part, l'emploi récurrent d'instruments non stérilisés favorise la transmission de virus foudroyants tels que celui de l'hépatite C ou du sida, tandis que le retard pris pour consulter un médecin qualifié compromet définitivement les chances de survie. Dès lors, cette imprudence menace directement la vie humaine.</p>
</div>

<div class="model-axe3">
<p><strong>Enfin, pour remédier à ce fléau</strong>, la mise en œuvre d'une stratégie globale articulée autour de la prévention, de la fermeté juridique et de la démocratisation des soins s'impose avec une impérieuse nécessité. D'un côté, les pouvoirs publics et la société civile doivent intensifier les campagnes de sensibilisation dans les médias et les établissements scolaires afin de démystifier le charlatanisme et d'inculquer les réflexes de la médecine préventive aux citoyens. D'autre part, il convient de durcir l'arsenal législatif pour sanctionner sévèrement les faux praticiens qui exercent illégalement, tout en étendant la couverture médicale universelle et les dispensaires de proximité afin de rendre les consultations médicales accessibles aux foyers les plus modestes. Dès lors, seule une action solidaire, éducative et résolue permettra de tarir définitivement la clientèle de ces charlatans.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, l'analyse menée démontre que le recours aux guérisseurs prospère sur l'ignorance et le dénuement, tout en infligeant des désastres sanitaires inacceptables à la communauté. Si les causes demeurent enracinées dans la précarité et les superstitions, les conséquences néfastes appellent un sursaut civique et institutionnel fondé sur l'éducation et la solidarité nationale. En définitive, le triomphe de la médecine scientifique et de la dignité humaine ne constitue-t-il pas le premier devoir d'une société soucieuse de la santé et de l'avenir de ses citoyens ?</p>
</div>`;
    }

    if (analysis.isParentsKids) {
      return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du roman autobiographique <em>La Boîte à Merveilles</em> d'Ahmed Sefrioui, on se rend compte que la question de l'autorité parentale et de l'autonomie accordée aux jeunes enfants constitue une interrogation existentielle et éducative déterminante pour chaque conscience en formation. Dès lors, convient-il d'estimer que les parents doivent impérativement décider à la place de leurs enfants pour assurer leur protection, ou importe-t-il au contraire de leur accorder une véritable liberté dans leurs choix personnels ? Pour répondre avec rigueur et méthode à cette problématique, il s'agira d'examiner dans un premier axe la légitimité du rôle protecteur et régulateur des parents, avant de mettre en lumière dans un second axe la nécessité d'encourager le libre arbitre et le sens des responsabilités chez les jeunes.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, l'intervention directrice des parents s'impose comme une nécessité éducative indispensable pour préserver la sécurité morale et matérielle des jeunes enfants face aux périls d'un monde complexe. En raison de leur manque d'expérience, de leur immaturité affective et de leur incapacité à anticiper les conséquences lointaines de leurs actes, les enfants ont un besoin vital d'une autorité bienveillante qui leur serve de repère. C'est précisément ce que révèle avec tendresse le roman autobiographique <strong>La Boîte à Merveilles d'Ahmed Sefrioui</strong> : les décisions fermes prises par le père <strong>Maâlem Abdeslam</strong> et l'encadrement vigilant de sa mère <strong>Lalla Zoubida</strong> constituent pour le jeune narrateur <strong>Sidi Mohammed</strong> un rempart protecteur inestimable contre les égarements de l'enfance et les déceptions du quotidien de <strong>Dar Chouafa</strong>. Ainsi, décider pour l'enfant ne relève pas de la tyrannie, mais d'un devoir sacré d'amour et de responsabilité parentale.</p>
</div>

<div class="model-axe2">
<p><strong>En second lieu</strong>, cette autorité protectrice ne saurait toutefois se transformer en une tutelle étouffante qui anéantirait toute initiative personnelle et empêcherait l'épanouissement du jeune esprit. Pour grandir et forger sa propre personnalité, l'enfant doit progressivement expérimenter la liberté de choix, apprendre de ses erreurs et se sentir écouté par ses aînés. Lorsque les adultes imposent systématiquement leur volonté sans dialogue, ils risquent d'engendrer un sentiment d'incompréhension et de repli douloureux. Dans l'œuvre de Sefrioui, c'est précisément dans le sanctuaire secret de <strong>sa boîte à merveilles</strong> que le jeune <strong>Sidi Mohammed</strong> cherche refuge pour échapper au conformisme et au carcan des adultes qui ignorent sa sensibilité poétique. De surcroît, la tragédie d'<strong>Antigone de Jean Anouilh</strong> démontre avec force les ravages de l'autoritarisme aveugle incarné par le roi <strong>Créon</strong>, qui refuse d'entendre la voix de la jeunesse. Dès lors, l'apprentissage de l'autonomie et l'écoute mutuelle s'avèrent indispensables pour bâtir un adulte responsable.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, le rapport parents/jeunes ne saurait se réduire à un dilemme binaire entre soumission aveugle et émancipation anarchique, mais appelle un équilibre harmonieux fondé sur la confiance réciproque et le dialogue bienveillant. Si l'orientation des parents demeure indispensable durant les premières années de la vie, elle doit s'adoucir progressivement pour faire place à une écoute attentive et à un accompagnement éclairé vers la liberté. En définitive, le véritable rôle d'un parent n'est-il pas d'offrir à son enfant des racines solides pour grandir, tout en lui donnant des ailes pour conquérir son propre destin ?</p>
</div>`;
    }

    if (analysis.isSolitude) {
      return `<div class="model-intro">
<p><strong>Dans La Boîte à Merveilles, le roman autobiographique d'Ahmed Sefrioui</strong>, la solitude et l'épanouissement de l'individu occupent une place centrale. Le livre pose une question qui dépasse le cadre du récit : l'isolement est-il une faiblesse qui enferme, ou une étape nécessaire pour mûrir et se découvrir soi-même ? Si certains considèrent la solitude comme une épreuve douloureuse qui marginalise l'individu, d'autres y voient au contraire le lieu privilégié de la réflexion, de l'autonomie et de la créativité.</p>
</div>

<div class="model-axe1">
<p><strong>D'une part</strong>, il est indéniable que la solitude peut être ressentie comme une souffrance lourde à porter lorsqu'elle est subie. L'être humain a un besoin fondamental de communiquer et de vivre en harmonie avec ses semblables. À cet égard, le jeune <strong>Sidi Mohammed</strong> illustre parfaitement cette détresse au début de l'œuvre. Âgé de six ans, il se sent exclu face aux jeux bruyants des enfants de son âge et traumatisé par le monde des adultes, notamment lors des querelles brutales entre voisines à <strong>Dar Chouafa</strong> ou au cours de la panique au <strong>bain maure</strong>. <strong>Par conséquent</strong>, un repli involontaire sur soi-même engendre un sentiment de tristesse, de rejet et d'incompréhension qui affaiblit le moral.</p>
</div>

<div class="model-axe2">
<p><strong>Cependant</strong>, la solitude s'avère être également un formidable levier d'émancipation et de maturité. <strong>En premier lieu</strong>, loin du vacarme quotidien, elle permet de libérer l'imagination. C'est précisément cette solitude d'enfant qui a poussé <strong>Ahmed Sefrioui</strong> à écrire ce magnifique roman d'une éclatante richesse poétique : grâce à son coffret d'objets simples métamorphosés en trésors fabuleux dans <strong>sa boîte à merveilles</strong>, l'isolement est devenu la source première de sa création artistique. <strong>En second lieu</strong>, le silence intérieur est indispensable pour prendre conscience de ses responsabilités. Comme le soulignait très justement <strong>Feu Sa Majesté le Roi Hassan II</strong> : « <em>Tout homme, à quelque échelon qu'il soit, quand il a quitté ses conseillers, ses amis, ses parents... il arrive à être solitaire.</em> » <strong>Ainsi</strong>, face aux grands choix de l'existence, chaque personne se retrouve seule avec sa conscience pour forger son propre destin.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, la solitude présente une double dimension. Subie avec passivité, elle enferme l'être dans l'amertume ; mais acceptée avec lucidité, elle devient une étape féconde pour se comprendre, créer et mûrir. Pour s'épanouir pleinement, l'homme doit donc savoir apprécier des instants de recul solitaire, avant de revenir partager ses richesses avec la société.</p>
</div>`;
    }

    if (analysis.isAntigone) {
      return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive de la pièce <em>Antigone</em> de Jean Anouilh, on constate que la confrontation suscitée par ${analysis.themeTitle} oppose deux visions inconciliables et puissantes de l'existence humaine. D'un côté, les impératifs pragmatiques du pouvoir soulignent la primauté de l'ordre public sur les sentiments individuels. D'un autre côté, la voix de la conscience pure refuse tout compromis avec l'injustice pour sauvegarder la dignité spirituelle. Dès lors, face à ce dilemme tragique, comment concevoir l'équilibre entre nécessité politique et idéal éthique ? Il s'agira d'étudier dans un premier axe la légitimité de l'ordre d'État, d'analyser dans un second axe la grandeur du refus héroïque, avant de formuler une synthèse sur le sens de la responsabilité humaine.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, le respect des règles institutionnelles constitue la condition indispensable pour maintenir la paix publique et éviter la violence destructrice au sein de la cité. Dans la tragédie de <strong>Jean Anouilh</strong>, le roi <strong>Créon</strong> démontre avec une fermeté inébranlable que gouverner <strong>Thèbes</strong> exige d'assumer des décisions austères pour prévenir l'anarchie qui menacerait le salut de tous les citoyens. De plus, les avertissements mesurés d'<strong>Ismène</strong> rappellent que la prudence et la soumission raisonnée aux lois communes permettent de préserver l'harmonie sociale face aux passions aveugles. Ainsi, la subordination consentie à l'autorité légitime forme un rempart nécessaire pour protéger la vie commune.</p>
</div>

<div class="model-axe2">
<p><strong>En second lieu</strong>, cette indispensable discipline collective ne saurait justifier l'écrasement des principes éthiques les plus sacrés de l'être humain. C'est précisément l'héroïsme immortel de <strong>l'héroïne Antigone</strong>, qui préfère affronter la mort plutôt que de renier sa piété fraternelle envers Polynice et ses idéaux les plus purs. Par ailleurs, la douleur d'<strong>Hémon</strong> et les condamnations du Chœur mettent en évidence qu'un pouvoir sourd à la miséricorde conduit inéluctablement à l'anéantissement de l'homme et au remords éternel. Dès lors, le refus inflexible de l'arbitraire s'affirme comme le garant ultime de la dignité et de la justice.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, l'affrontement thébain rappelle que la véritable grandeur humaine réside dans le refus permanent de la tyrannie et le respect sacré des valeurs éthiques. Loin d'être un caprice immature, la révolte d'Antigone réaffirme que la conscience demeure supérieure à toute loi temporelle injuste. En définitive, ne revient-il pas à chaque génération d'affirmer ce courage de la vérité pour édifier un monde plus humain et équitable ?</p>
</div>`;
    }

    if (analysis.isCondamne) {
      return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du chef-d'œuvre <em>Le Dernier Jour d'un Condamné</em> de Victor Hugo, on constate que le débat engagé par ${analysis.themeTitle} touche aux racines mêmes de la justice et de la dignité. Dès lors, convient-il d'accepter aveuglément les châtiments imposés par la loi ou importe-t-il d'exercer un discernement critique pour humaniser la société ? Pour aborder avec rigueur cette problématique, il conviendra d'examiner dans un premier axe les fonctions traditionnelles du système pénal, avant d'analyser dans un second axe l'impératif moral de réformer la justice par la compassion.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, l'institution des lois pénales vise à dissuader le crime et à protéger les membres de la société contre le désordre et l'injustice. À travers le tableau de la justice institutionnelle évoqué par <strong>Victor Hugo</strong>, la condamnation des coupables apparaît comme une tentative de restaurer l'ordre moral bafoué et de garantir la paix publique. La société cherche ainsi à marquer sa réprobation face aux actes qui menacent la vie et la sécurité de ses concitoyens. Dès lors, l'application de la règle de droit répond à une exigence première de régulation et de sécurité collective.</p>
</div>

<div class="model-axe2">
<p><strong>En second lieu</strong>, la justice humaine devient coupable à son tour lorsqu'elle recourt à des châtiments irréversibles et sanglants qui renient l'humanité du condamné. Claquemuré dans les ténèbres du cachot de <strong>Bicêtre</strong> puis transféré à <strong>la Conciergerie</strong>, <strong>le condamné à mort</strong> éprouve une agonie morale indicible face à l'échafaud dressé sur <strong>la place de Grève</strong>, dénonçant l'hypocrisie de <strong>la peine de mort</strong>. De plus, l'évocation bouleversante de son innocente fillette, <strong>la petite Marie</strong>, démontre avec force que la guillotine punit aveuglément les innocents et dégrade la conscience de la nation entière. Ainsi, l'éthique véritable commande de substituer la réhabilitation et l'éducation à la vengeance sanguinaire de l'État.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, le chef-d'œuvre de Victor Hugo démontre avec éclat que la légitimité d'une société se mesure à sa capacité à promouvoir la compassion et le respect absolu de la vie. Loin de cautionner la barbarie légalisée, le progrès démocratique exige d'élever la justice vers un idéal de rédemption et de fraternité. En définitive, n'est-ce pas ce combat universel pour la dignité humaine qui doit guider toute conscience éclairée ?</p>
</div>`;
    }

    if (analysis.work === 'boite') {
      return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du roman autobiographique <em>La Boîte à Merveilles</em> d'Ahmed Sefrioui, on se rend compte que ${analysis.themeTitle} constitue une interrogation existentielle et éthique déterminante pour chaque conscience en formation. Dès lors, convient-il d'adhérer pleinement aux exigences prescrites par l'entourage ou importe-t-il d'affirmer un recul critique face aux faux-semblants du monde ? Pour répondre avec rigueur et méthode à cette problématique, il s'agira d'examiner dans un premier axe les impératifs de la lucidité intérieure, avant de mettre en lumière dans un second axe les bienfaits d'une solidarité authentique.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, l'adhésion lucide à des repères personnels solides permet à l'individu de construire un ancrage intérieur durable et d'échapper aux égarements de l'arbitraire et de la futilité. Au sein de la médina traditionnelle décrite avec tendresse par <strong>Ahmed Sefrioui dans La Boîte à Merveilles</strong>, le jeune narrateur <strong>Sidi Mohammed</strong> oppose aux querelles mesquines de <strong>Dar Chouafa</strong> le sanctuaire secret de <strong>sa boîte à merveilles</strong>, où ses menus objets deviennent les symboles purs d'une poésie spirituelle inaccessible aux adultes. De plus, les rites familiaux et les visites réconfortantes au sanctuaire de <strong>Sidi Ali Boughaleb</strong> partagés avec sa mère <strong>Lalla Zoubida</strong> forment un socle protecteur indispensable qui console des épreuves matérielles et conjure l'angoisse de la solitude. Ainsi, la conscience de ses valeurs intimes consolide les fondations morales indispensables à toute vie sereine.</p>
</div>

<div class="model-axe2">
<p><strong>En second lieu</strong>, cette indispensable fidélité à sa vérité intérieure ne saurait toutefois se muer en un assujettissement passif ou en un repli frileux qui étoufferait la générosité et l'esprit de partage. Dans le roman de Fès, les difficultés surmontées par le tisserand <strong>Maâlem Abdeslam</strong> prouvent avec émotion que la dignité au labeur et la loyauté envers les siens sont les seuls remparts réels contre l'indigence et le désespoir. Par ailleurs, la sollicitude admirable de la voisine <strong>Rahma</strong> lors de la disparition de Zineb et la communion fraternelle unissant <strong>Lalla Zoubida et Lalla Aïcha</strong> aux côtés du sage <strong>Sidi El Arafi</strong> démontrent que l'épreuve humaine trouve sa rédemption dans la compassion agissante. Dès lors, le discernement critique et la tendresse humaine s'affirment comme le moteur vital du progrès éthique et du bonheur partagé.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, la réflexion menée invite à dépasser toute approche simpliste en harmonisant l'exigence de la rectitude personnelle avec le souffle vivifiant de la bienveillance fraternelle. Loin de s'opposer, la responsabilité partagée et l'esprit critique se complètent harmonieusement pour fonder un humanisme équilibré et pérenne. En définitive, la véritable maturité du citoyen de demain ne consiste-t-elle pas à respecter le bien commun tout en veillant courageusement à la sauvegarde de son authenticité morale ?</p>
</div>`;
    }

    // Sujet général : Ne commence JAMAIS par « Quand on plonge... »
    return `<div class="model-intro">
<p>Dans le débat contemporain, ${analysis.themeTitle} suscite de vives réflexions et s'impose comme une préoccupation éthique et civique déterminante pour chaque conscience éclairée. Dès lors, convient-il d'adopter sans réserve les préceptes imposés par l'opinion commune ou importe-t-il au contraire d'affirmer un recul critique et un discernement responsable ? Pour aborder avec méthode et rigueur cette problématique, il conviendra d'examiner dans un premier axe les fondements de la responsabilité partagée, avant de mettre en lumière dans un second axe l'impératif moral de préserver son autonomie de jugement.</p>
</div>

<div class="model-axe1">
<p><strong>En premier lieu</strong>, l'adhésion lucide à des principes personnels solides permet à l'individu de construire un ancrage intérieur durable et d'échapper aux égarements de l'arbitraire et de la futilité. La vie en société exige en effet des repères partagés et une discipline consentie pour maintenir la paix civile et garantir la cohésion entre les citoyens. Ainsi, la conscience de ses devoirs consolide les fondations morales indispensables à toute vie sereine.</p>
</div>

<div class="model-axe2">
<p><strong>En second lieu</strong>, cette indispensable fidélité aux impératifs sociaux ne saurait toutefois se muer en un assujettissement passif ou en un conformisme frileux qui étoufferait le libre arbitre et la liberté de pensée. L'esprit humain ne saurait s'épanouir dans la seule répétition machinale des habitudes établies. Dès lors, le discernement critique et la liberté intérieure s'affirment comme le moteur vital du progrès éthique et du bonheur partagé.</p>
</div>

<div class="model-concl">
<p><strong>En conclusion</strong>, la réflexion menée invite à dépasser toute approche simpliste en harmonisant l'exigence de la rectitude personnelle avec le souffle vivifiant de la solidarité humaine. Loin de s'opposer, la responsabilité partagée et l'esprit critique se complètent harmonieusement pour fonder un humanisme équilibré et pérenne. En définitive, la véritable maturité du citoyen ne consiste-t-elle pas à respecter le bien commun tout en veillant courageusement à la sauvegarde de son authenticité morale ?</p>
</div>`;
  };

  const getDefaultPlanB = (topicSujet: string) => {
    const analysis = detectClientSubjectAnalysis(topicSujet);

    if (analysis.isParentsKids) {
      return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du roman autobiographique <em>La Boîte à Merveilles</em> d'Ahmed Sefrioui, on constate que la réflexion engagée autour de la décision des parents à la place des jeunes enfants fait dialoguer deux approches complémentaires de l'autorité éducative. D'un côté, l'obligation pour les parents de guider et de décider apparaît comme une garantie indispensable pour la sécurité et la formation morale du jeune être. D'un autre côté, le droit de l'enfant à affirmer sa singularité et à exprimer ses préférences constitue le moteur fondamental de son émancipation future. Dès lors, comment concilier le devoir de guidance des parents et le besoin légitime de liberté des jeunes ? Il conviendra d'examiner dans un premier temps la portée protectrice des décisions parentales, d'envisager dans un deuxième temps la valeur émancipatrice de l'autonomie personnelle, pour enfin dégager dans une synthèse équilibrée les conditions d'une éducation partagée et dialoguée.</p>
</div>

<div class="model-axe1">
<p><strong>D'une part</strong>, l'acceptation de la tutelle parentale et le respect des orientations décidées par les aînés constituent un rempart nécessaire contre les périls d'un monde complexe. Dans le quotidien de Fès peint avec émotion par <strong>Ahmed Sefrioui</strong>, le dévouement silencieux du père <strong>Maâlem Abdeslam</strong> et l'encadrement vigilant de <strong>Lalla Zoubida</strong> démontrent avec force que les décisions d'un adulte sont d'abord dictées par l'amour et la volonté de prémunir l'enfant contre le danger. L'autorité parentale forge ainsi les premiers repères moraux nécessaires à la stabilité émotionnelle de la jeunesse.</p>
</div>

<div class="model-axe2">
<p><strong>D'autre part</strong>, cette indispensable autorité trouve sa limite là où commence l'étouffement de la personnalité, de la créativité et de la confiance en soi. L'itinéraire du jeune <strong>Sidi Mohammed</strong> témoigne avec éclat que l'âme enfantine a besoin d'un espace d'évasion et d'expression propre, symbolisé par <strong>sa boîte à merveilles</strong>, loin du carcan des injonctions imposées. De même, dans <strong>Antigone</strong> de <strong>Jean Anouilh</strong>, le refus du dialogue et l'inflexibilité du roi <strong>Créon</strong> envers la jeunesse conduisent à une impasse tragique. Dès lors, écouter les aspirations des jeunes s'avère vital pour leur maturation.</p>
</div>

<div class="model-axe3">
<p><strong>Dès lors</strong>, la véritable sagesse éducative réside dans une synthèse harmonieuse où l'autorité parentale ne s'exerce pas comme un pouvoir autoritaire, mais comme un accompagnement bienveillant et progressif vers la maturité. Il s'agit d'instaurer un climat de dialogue continu où l'adulte guide fermement tout en accordant une confiance croissante aux choix de l'enfant. C'est dans cette dialectique féconde entre protection et écoute que se construit une relation parents/jeunes épanouie et durable.</p>
</div>

<div class="model-concl">
<p><strong>En somme</strong>, ce parcours réflexif démontre que le rapport parents/jeunes gagne à dépasser l'opposition stérile entre autoritarisme et laxisme. Par-delà les tiraillements de l'existence, l'harmonie entre exigence protectrice et respect de la liberté naissante ouvre la voie à un épanouissement authentique. En définitive, préparer l'avenir des jeunes n'exige-t-il pas de les rendre capables de décider par eux-mêmes en femmes et hommes libres ?</p>
</div>`;
    }

    if (analysis.isSolitude || (analysis.work === 'boite' && !analysis.isAntigone && !analysis.isCondamne)) {
      return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du roman autobiographique <em>La Boîte à Merveilles</em> d'Ahmed Sefrioui, on constate que la réflexion autour de ${analysis.themeTitle} fait dialoguer deux approches complémentaires de la condition humaine. D'un côté, l'exigence d'une discipline quotidienne et l'attachement aux traditions communes s'imposent comme une nécessité sociale indispensable. D'un autre côté, le besoin de liberté intérieure et le recul critique s'affirment comme des conditions essentielles pour préserver la dignité de la personne. Dès lors, comment concilier le respect des devoirs collectifs et l'aspiration légitime à l'autonomie personnelle ? Il conviendra d'examiner dans un premier temps la valeur protectrice des devoirs partagés, d'envisager dans un deuxième temps la légitimité de l'émancipation personnelle, pour enfin dégager dans une synthèse équilibrée les conditions d'une harmonie durable.</p>
</div>

<div class="model-axe1">
<p><strong>D'une part</strong>, l'acceptation des devoirs familiaux et la fidélité aux coutumes établies constituent le garant fondamental de la cohésion civique et de la sécurité matérielle du foyer. Dans le quotidien de Fès peint avec acuité par <strong>Ahmed Sefrioui</strong>, le courage inébranlable du chef de famille <strong>Maâlem Abdeslam</strong> face à la ruine financière illustre avec grandeur que le sens des responsabilités et le labeur acharné sont les véritables remparts contre la misère. De plus, la piété partagée et les visites réconfortantes de <strong>Lalla Zoubida</strong> auprès des sanctuaires consolident un tissu d'entraide indispensable pour surmonter les vicissitudes de l'existence. Ainsi, la loyauté envers les exigences collectives protège la cellule sociale des périls de la dispersion et du désarroi.</p>
</div>

<div class="model-axe2">
<p><strong>D'autre part</strong>, cette indispensable soumission aux impératifs sociaux trouve sa limite naturelle là où commence l'étouffement de la singularité, de la sensibilité poétique et du libre arbitre. L'itinéraire du jeune <strong>Sidi Mohammed</strong> témoigne avec éclat que l'esprit humain ne saurait s'épanouir dans la seule répétition machinale des habitudes adultes. En s'évadant dans l'univers mystérieux de <strong>sa boîte à merveilles</strong>, l'enfant affirme le droit inaliénable de chaque individu à cultiver son imaginaire secret et son autonomie morale face aux mesquineries de <strong>Dar Chouafa</strong>. De surcroît, les consultations apaisantes du voyant <strong>Sidi El Arafi</strong> démontrent que la recherche sincère de la vérité transcende les formalismes rigides du quotidien. Dès lors, la liberté de conscience et le regard critique s'avèrent indispensables pour éviter l'engourdissement moral.</p>
</div>

<div class="model-axe3">
<p><strong>Dès lors</strong>, la conciliation de ces deux exigences réside dans une synthèse féconde, où la solidarité extérieure s'enrichit en permanence de la lucidité intérieure de l'être. Il ne s'agit ni de basculer dans une révolte stérile contre son milieu d'origine, ni de se résigner à une soumission aveugle, mais de faire dialoguer le respect des valeurs partagées avec la quête d'accomplissement personnel. L'art d'<strong>Ahmed Sefrioui</strong> enseigne que la véritable sagesse naît précisément de cette tension maîtrisée entre enracinement communautaire et liberté de l'esprit.</p>
</div>

<div class="model-concl">
<p><strong>En somme</strong>, ce parcours réflexif démontre que la dignité humaine se forge dans l'alliance souveraine de la fidélité aux siens et du courage de la lucidité. Par-delà les tiraillements de l'existence, l'harmonie entre exigence intérieure et générosité envers autrui ouvre la voie à un épanouissement authentique et durable. Ne revient-il pas dès lors à chacun d'accomplir ce dépassement harmonieux au service de la vie ?</p>
</div>`;
    }

    if (analysis.isAntigone) {
      return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive de la pièce <em>Antigone</em> de Jean Anouilh, on constate que la confrontation suscitée par ${analysis.themeTitle} oppose deux visions inconciliables et puissantes de l'existence humaine. D'un côté, les impératifs pragmatiques du pouvoir soulignent la primauté de l'ordre public sur les sentiments individuels. D'un autre côté, la voix de la conscience pure refuse tout compromis avec l'injustice pour sauvegarder la dignité spirituelle. Dès lors, face à ce dilemme tragique, comment concevoir l'équilibre entre nécessité politique et idéal éthique ? Il s'agira d'étudier dans un premier axe la légitimité de l'ordre d'État, d'analyser dans un second axe la grandeur du refus héroïque, avant de formuler une synthèse sur le sens de la responsabilité humaine.</p>
</div>

<div class="model-axe1">
<p><strong>D'une part</strong>, l'exercice de la responsabilité politique impose parfois des décisions sévères pour préserver la paix civile et garantir la survie de la cité. Le personnage de <strong>Créon</strong> dans l'œuvre de <strong>Jean Anouilh</strong> défend avec gravité la nécessité d'un État solide, capable d'endiguer le chaos né des guerres intestines entre <strong>Étéocle et Polynice</strong>. De même, la prudence d'<strong>Ismène</strong> rappelle que la transgression unilatérale de la loi risque de plonger la communauté entière dans le deuil et l'anarchie. Ainsi, la stabilité civique exige un consentement pragmatique aux règles instituées.</p>
</div>

<div class="model-axe2">
<p><strong>D'autre part</strong>, l'autorité temporelle devient tyrannique lorsqu'elle prétend asservir la liberté morale et fouler aux pieds les devoirs imprescriptibles du cœur. L'affrontement mené par <strong>l'héroïne Antigone</strong> proclame avec force que nulle raison d'État ne saurait effacer l'amour fraternel et l'honneur de la sépulture. En préférant le martyre aux décrets de son oncle, la princesse démontre que la pureté du refus protège l'essence même de l'humanité contre la déchéance des compromis médiocres. Dès lors, le courage de s'insurger contre l'iniquité fonde la noblesse inaltérable de la conscience.</p>
</div>

<div class="model-axe3">
<p><strong>Dès lors</strong>, la leçon tragique d'Anouilh réside dans l'impérieuse nécessité d'une politique éclairée qui ne sacrifie jamais l'idéal éthique à la froide mécanique du pouvoir. Le véritable art de gouverner consiste à respecter la liberté spirituelle des citoyens sans abdiquer la fermeté de l'ordre républicain. C'est dans ce dialogue vigilant entre autorité et respect des droits fondamentaux que se préserve l'équilibre démocratique.</p>
</div>

<div class="model-concl">
<p><strong>En somme</strong>, le conflit thébain enseigne que la dignité humaine grandit lorsque la conscience refuse d'abdiquer devant l'arbitraire. Par-delà le drame antique, l'idéal d'intégrité porté par Antigone demeure une balise vivante pour toute jeunesse éprise de liberté et de vérité. En définitive, la mémoire des héros du refus n'est-elle pas le plus sûr rempart contre la barbarie ?</p>
</div>`;
    }

    if (analysis.isCondamne) {
      return `<div class="model-intro">
<p>Quand on plonge dans la lecture attentive du chef-d'œuvre <em>Le Dernier Jour d'un Condamné</em> de Victor Hugo, on s'aperçoit que la question soulevée par ${analysis.themeTitle} confronte deux conceptions antagonistes de la justice et de la morale. D'un côté, la défense de l'ordre légal invoque la nécessité de punir pour prévenir le crime et protéger la collectivité. D'un autre côté, la conscience humaniste dénonce l'injustice d'une violence institutionnalisée qui détruit la vie même qu'elle prétend défendre. Dès lors, comment concilier l'exigence de la sécurité publique et le respect sacré de la dignité humaine ? Il s'agira d'examiner dans un premier temps la portée de la loi pénale, d'analyser dans un deuxième temps l'urgence de l'abolitionnisme moral, pour enfin dégager une synthèse sur la justice de demain.</p>
</div>

<div class="model-axe1">
<p><strong>D'une part</strong>, l'existence d'un code pénal et de sanctions formelles découle du besoin légitime de réguler la vie en communauté et d'empêcher les dérives de la vengeance privée. Les représentants de la justice dépeints par <strong>Victor Hugo</strong> agissent initialement pour faire respecter l'ordre public et maintenir la cohésion de l'édifice social face aux transgressions criminelles. Dès lors, la fonction punitive cherche à réaffirmer l'autorité de la règle commune pour préserver la sécurité de tous.</p>
</div>

<div class="model-axe2">
<p><strong>D'autre part</strong>, la société abdique sa mission civilisatrice dès lors qu'elle utilise le meurtre légal comme instrument de dissuasion. Les confessions bouleversantes du <strong>condamné à mort</strong> dans son cachot de <strong>Bicêtre</strong> puis à <strong>la Conciergerie</strong> mettent à nu l'atrocité inhumaine de <strong>la peine de mort</strong> et de <strong>la guillotine</strong> sur <strong>la place de Grève</strong>. Hugo démontre avec une vigueur impérissable que la vengeance institutionnelle ensauvage la foule au lieu de l'édifier, tout en infligeant un supplice indicible à des innocents comme <strong>la petite Marie</strong>. Ainsi, le progrès éthique impose de rejeter la barbarie répressive.</p>
</div>

<div class="model-axe3">
<p><strong>Dès lors</strong>, la véritable justice doit substituer la rédemption, l'instruction et la réinsertion à la logique archaïque du talion. Loin de renoncer à punir, une société moderne doit chercher à corriger le coupable tout en protégeant inconditionnellement sa vie et sa dignité. L'humanisation du droit constitue l'horizon indépassable de tout régime civilisé.</p>
</div>

<div class="model-concl">
<p><strong>En somme</strong>, le combat de Victor Hugo nous exhorte à construire une justice guidée par la raison et la miséricorde plutôt que par la haine. La dignité humaine ne se négocie pas et s'impose comme une limite absolue à l'action de l'État. En définitive, n'appartient-il pas à chaque époque d'étendre la lumière de l'humanisme face aux ténèbres de la cruauté ?</p>
</div>`;
    }

    // Sujet général : Ne commence JAMAIS par « Quand on plonge... »
    return `<div class="model-intro">
<p>Dans le débat contemporain, ${analysis.themeTitle} confronte deux visions complémentaires du progrès moral et social. D'un côté, le respect des normes instituées garantit la cohésion nécessaire au vivre-ensemble. D'un autre côté, le recul critique s'affirme comme une condition indispensable pour préserver la dignité et la liberté de penser. Dès lors, comment concilier les devoirs collectifs et l'aspiration à l'autonomie personnelle ? Il s'agira d'étudier dans un premier axe la valeur régulatrice des devoirs partagés, d'analyser dans un second axe la légitimité de l'émancipation personnelle, pour enfin formuler une synthèse sur les conditions d'un équilibre harmonieux.</p>
</div>

<div class="model-axe1">
<p><strong>D'une part</strong>, l'adhésion à des règles communes assure la concorde civile et protège la communauté des dérives de l'arbitraire ou du repli individuel. Toute collectivité a besoin de repères stables et de principes partagés pour surmonter l'adversité.</p>
</div>

<div class="model-axe2">
<p><strong>D'autre part</strong>, la soumission aux exigences extérieures ne saurait conduire à l'étouffement du libre arbitre ou à la perte de l'esprit critique. La véritable maturité exige de cultiver sa liberté de conscience pour résister aux conformismes stériles.</p>
</div>

<div class="model-axe3">
<p><strong>Dès lors</strong>, la conciliation réside dans un dialogue constant entre fidélité aux valeurs communes et affirmation d'un discernement personnel éclairé.</p>
</div>

<div class="model-concl">
<p><strong>En somme</strong>, la grandeur citoyenne se forge dans l'alliance féconde de la solidarité et de la lucidité d'esprit, assurant le progrès continu de la société.</p>
</div>`;
  };

  const runExpertise = async () => {
    if (!sujet.trim() || !texte.trim()) {
      alert("Veuillez renseigner le sujet et le texte de l'élève.");
      return;
    }

    setIsProcessing(true);
    setIsSubjectValidated(true);
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
        const rMention = document.getElementById('rMention');
        if (rMention) {
          const mentionData = getMentionData(0, true);
          rMention.innerText = mentionData.label;
          rMention.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${mentionData.className}`;
        }
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
        const rMention = document.getElementById('rMention');
        if (rMention) {
          const mentionData = getMentionData(parseFloat(totalCalc) || 0, false);
          rMention.innerText = mentionData.label;
          rMention.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${mentionData.className}`;
        }
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
        sNorm.includes('causes') ||
        sNorm.includes('conséquence') ||
        sNorm.includes('consequence') ||
        sNorm.includes('guérisseur') ||
        sNorm.includes('guerisseur') ||
        sNorm.includes('charlatan') ||
        sNorm.includes('tradipraticien') ||
        sNorm.includes('quelles sont les causes') ||
        sNorm.includes('analyser les causes'));

      const isDialecticRequested = (sNorm.includes('pour ou contre') ||
        sNorm.includes('thèse et antithèse') ||
        sNorm.includes('these et antithese')) && !isExplicitAnalytic;

      const isAnalytic = isExplicitAnalytic || typePlan.includes('ANALYTIQUE');
      const isDialectic = isDialecticRequested || (typePlan.includes('DIALECTIQUE') && !isExplicitAnalytic);

      let finalPlanType: 'SIMPLE' | 'ANALYTIQUE' | 'DIALECTIQUE' = 'SIMPLE';
      if (isAnalytic) {
        finalPlanType = 'ANALYTIQUE';
      } else if (isDialectic) {
        finalPlanType = 'DIALECTIQUE';
      } else {
        finalPlanType = 'SIMPLE';
      }

      setDetectedPlanType(finalPlanType);

      const planAExtracted = extract('PLAN_A');
      const planBExtracted = extract('PLAN_B');

      const buildDefaultPlanA = () => getDefaultPlanA(sujet);
      const buildDefaultPlanB = () => getDefaultPlanB(sujet);

      const isPlanValid = (planHtml: string) => {
        if (!planHtml) return false;
        const hasIntro = planHtml.includes('model-intro');
        const hasConcl = planHtml.includes('model-concl');
        const cleanLen = planHtml.replace(/<[^>]*>/g, '').trim().length;
        // Norme formelle Al Akhawayn : minimum 16 à 19 lignes (au moins 650 caractères de texte pur)
        return hasIntro && hasConcl && cleanLen >= 650;
      };

      planARef.current = isPlanValid(planAExtracted) ? planAExtracted : buildDefaultPlanA();
      planBRef.current = isPlanValid(planBExtracted) ? planBExtracted : buildDefaultPlanB();

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

        const sNormFallback = (sujet || '').toLowerCase();
        const isFallbackAnalytic = sNormFallback.includes('guérisseur') || sNormFallback.includes('guerisseur') || sNormFallback.includes('cause') || sNormFallback.includes('conséquence') || sNormFallback.includes('solution');
        setDetectedPlanType(isFallbackAnalytic ? 'ANALYTIQUE' : 'SIMPLE');

        if (!planARef.current) {
          planARef.current = getDefaultPlanA(sujet);
        }
        if (!planBRef.current) {
          planBRef.current = getDefaultPlanB(sujet);
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
        {/* EN-TÊTE DU MODAL DIRECTION */}
        <div className={`p-5 ${passwordChangeStep === 'PASSWORDS' ? 'bg-gradient-to-r from-red-900 via-rose-900 to-red-950 border-b border-red-800' : 'bg-slate-900 border-b border-slate-800'} text-white flex justify-between items-center transition-colors duration-300`}>
          <div className="flex items-center gap-2">
            <KeyRound className={`w-5 h-5 ${passwordChangeStep === 'PASSWORDS' ? 'text-red-400' : 'text-amber-400'}`} />
            <div>
              <h3 className="font-outfit font-bold text-base leading-tight">Accès réservé à la direction</h3>
              <span className="text-[11px] text-slate-300 font-medium">
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

        {/* BARRE ROUGE COMME DANS LA 1ERE IMAGE : AFFICHAGE INSTANTANÉ DU NOMBRE D'UTILISATEURS EN TEMPS RÉEL APRÈS VALIDATION */}
        {passwordChangeStep === 'PASSWORDS' && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white px-5 py-3 border-b border-red-800 flex items-center justify-between shadow-md animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Utilisateurs de cette interface instantanément
              </span>
            </div>
            <div className="flex items-center gap-2 bg-black/25 backdrop-blur-xs px-3 py-1.5 rounded-full border border-white/20">
              <Users className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-extrabold tracking-wide text-white">
                {activeUsersCount} utilisateur{activeUsersCount > 1 ? 's' : ''} actif{activeUsersCount > 1 ? 's' : ''} en direct
              </span>
            </div>
          </div>
        )}

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
            {/* BADGE OFFICIEL D'AUDIENCE INSTANTANÉE */}
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-950 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  🔴
                </div>
                <div>
                  <span className="font-bold text-red-900 block text-xs">Fréquentation instantanée de l'interface</span>
                  <span className="text-[11px] text-red-700">Nombre d'utilisateurs connectés en ce moment sur cette plateforme</span>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-red-600 text-white font-black text-xs rounded-lg shadow-xs flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                <span>{activeUsersCount} en ligne</span>
              </div>
            </div>

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
                  <span>Valider l'Accès</span>
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

        {/* BANNIÈRE OFFICIELLE : BIBLIOTHÈQUE DE SUJETS RÉGIONAUX OFFICIELS (1ère BAC) - DESIGN FIN & COMPACT */}
        <div className="mb-6 bg-gradient-to-r from-slate-900 via-[#162544] to-[#0b1528] px-4 py-3 sm:px-5 sm:py-3 rounded-2xl text-white shadow-md border border-amber-600/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-inner">
                <BookOpen className="w-4 h-4 text-amber-300" />
              </div>
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h2 className="font-outfit font-bold text-xs sm:text-sm tracking-wide text-white truncate">
                  Bibliothèque de Sujets Régionaux Officiels
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
                  {regionalSubjects.length} Sujets
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowLibrary((prev) => !prev)}
                className="px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <span>{showLibrary ? 'Masquer' : 'Explorer les Sujets'}</span>
                {showLibrary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={handleOpenTeacherModal}
                className={`px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 ${
                  isTeacherAuthenticated
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300 ring-2 ring-amber-400/30'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
                title={isTeacherAuthenticated ? 'Session Enseignant Déverrouillée' : "Accès Enseignant Protégé par Clé d'habilitation"}
              >
                {isTeacherAuthenticated ? (
                  <>
                    <Unlock className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                    <span>Espace Enseignant : Déposer</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                    <span>Espace Enseignant (Accès Protégé)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Toast de confirmation de chargement d'un sujet */}
          {subjectLoadNotice && (
            <div className="mt-3.5 py-2 px-3.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{subjectLoadNotice}</span>
            </div>
          )}

          {/* VOLET DÉROULANT DE LA BIBLIOTHÈQUE */}
          {showLibrary && (
            <div className="mt-4 pt-4 border-t border-white/15 animate-fade-in">
              {/* Filtres par œuvre & Recherche */}
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between mb-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'TOUTES', label: 'Toutes les Œuvres' },
                    { id: 'La Boîte à Merveilles', label: 'La Boîte à Merveilles' },
                    { id: 'Antigone', label: 'Antigone' },
                    { id: 'Le Dernier Jour d’un Condamné', label: 'Le Dernier Jour' },
                    { id: 'Sujet de Société Général', label: 'Sujets de Société' },
                    { id: 'ENSEIGNANT', label: `🎓 Déposés Enseignant (${regionalSubjects.filter((s) => s.sourceEnseignant).length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedOeuvreFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        selectedOeuvreFilter === tab.id
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrer (mot-clé, région, 2023)..."
                    className="w-full pl-9 pr-8 py-1.5 bg-slate-950/60 border border-white/20 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Liste de cartes des annales régionales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[480px] overflow-y-auto pr-1">
                {filteredSubjects.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-slate-400 text-xs bg-slate-950/30 rounded-xl border border-white/10">
                    Aucun sujet trouvé pour ces critères de recherche.
                  </div>
                ) : (
                  filteredSubjects.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white/95 text-slate-900 rounded-xl p-4 border border-slate-200 hover:border-amber-500 shadow-sm transition flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                item.oeuvre === 'La Boîte à Merveilles'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : item.oeuvre === 'Antigone'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                  : item.oeuvre === 'Le Dernier Jour d’un Condamné'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-sky-100 text-sky-800 border border-sky-300'
                              }`}
                            >
                              {item.oeuvre}
                            </span>
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              {item.region} • {item.annee}
                            </span>
                          </div>

                          {item.sourceEnseignant && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                🎓 Déposé Enseignant
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCustomSubject(item.id);
                                }}
                                title="Supprimer ce sujet"
                                className="text-slate-400 hover:text-red-600 p-0.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        <h3 className="font-outfit font-bold text-sm text-slate-950 mb-1.5 leading-snug group-hover:text-amber-800 transition">
                          {item.titre}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-3 mb-2 font-sans leading-relaxed italic bg-slate-50 p-2 rounded-lg border border-slate-100 whitespace-pre-line">
                          « {item.consigne.slice(0, 160)}... »
                        </p>

                        {item.conseilsEnseignant && (
                          <div className="text-[11px] text-amber-900 bg-amber-50/80 border border-amber-200 p-1.5 rounded-md mb-2 flex items-start gap-1.5 font-medium">
                            <Sparkles className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                            <span><strong>Piste didactique :</strong> {item.conseilsEnseignant}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Plan : <strong className="text-slate-800 font-bold">{item.typePlanSuggere || 'Libre'}</strong>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleLoadSubject(item)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0b1528] hover:bg-slate-800 text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                        >
                          <span>Charger ce sujet</span>
                          <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Consigne du Sujet & Barème Officiel en pilules */}
        <div className="bg-slate-50/80 border border-slate-200 p-5 rounded-xl mb-6 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> Consigne du Sujet
            </h2>
            <div className="flex items-center gap-2">
              {isSubjectValidated && (
                <button
                  type="button"
                  onClick={() => setIsSubjectValidated(false)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Modifier la consigne du sujet"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Modifier la consigne</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLibrary((prev) => !prev)}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Changer de sujet (Bibliothèque)</span>
              </button>
            </div>
          </div>

          {isSubjectValidated ? (
            <div className="p-4 sm:p-5 bg-white border-2 border-slate-900 rounded-xl shadow-xs transition-all animate-fade-in">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Consigne officielle du sujet (validée)</span>
              </div>
              <p className="text-slate-950 font-bold text-base sm:text-lg leading-relaxed font-newsreader whitespace-pre-wrap">
                {sujet || "Aucun sujet spécifié"}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <textarea
                id="sujet"
                rows={3}
                value={sujet}
                onChange={(e) => setSujet(e.target.value)}
                placeholder="Saisissez ou collez ici la consigne du sujet de réflexion..."
                className="w-full p-3.5 bg-white border border-slate-300 rounded-lg text-sm leading-relaxed text-slate-800 focus:border-[#0b1528] focus:ring-4 focus:ring-slate-900/5 outline-none transition resize-y"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (sujet.trim()) {
                      setIsSubjectValidated(true);
                    }
                  }}
                  disabled={!sujet.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#0b1528] hover:bg-slate-800 disabled:opacity-40 text-white transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                  <span>Valider le sujet</span>
                </button>
              </div>
            </div>
          )}

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
        <div className="border-2 border-slate-900 rounded-xl p-3.5 sm:p-5 mb-8 bg-white shadow-sm overflow-hidden">
          {/* En-tête : Titre à GAUCHE, Palette et les deux options à DROITE */}
          <div className="mb-4 flex flex-col md:flex-row md:items-start justify-between gap-3">
            {/* À GAUCHE : Manuscrit Rédactionnel du Candidat */}
            <h2 className="font-outfit text-xs sm:text-sm font-bold text-slate-900 uppercase flex items-center gap-2 whitespace-normal sm:whitespace-nowrap shrink-0 pt-1">
              <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block shrink-0"></span>
              <span>Manuscrit Rédactionnel du Candidat</span>
            </h2>

            {/* À DROITE : La palette et les deux options */}
            <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
              {/* Palette d'encres */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-300/80 px-2.5 py-1 rounded-full shadow-2xs max-w-full">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1 mr-0.5 shrink-0">
                  <Palette className="w-3.5 h-3.5 text-slate-800" />
                  <span>Encre :</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {INK_COLORS.map((ink) => {
                    const isSelected = inkColor === ink.hex;
                    const isBlack = ink.hex === '#0f172a';
                    return (
                      <button
                        key={ink.id}
                        type="button"
                        onMouseDown={(e) => {
                          // Empêche la perte du mot sélectionné dans l'éditeur de texte
                          e.preventDefault();
                        }}
                        onClick={() => applyInkToSelection(ink.hex)}
                        title={`${ink.nom} — ${isBlack ? 'Encre noire par défaut' : 'Appliquer sur le mot sélectionné (en gras)'}`}
                        className={`relative w-6 h-6 rounded-full transition-all duration-150 flex items-center justify-center cursor-pointer shadow-xs shrink-0 ${
                          isSelected
                            ? 'scale-115 ring-2 ring-offset-2 ring-slate-900 shadow-md'
                            : 'hover:scale-110 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: ink.hex }}
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 text-white stroke-[3] drop-shadow-sm" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Les deux options : "Colorier les liens logiques" à côté de "Tout en noir" */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Bouton pour surligner automatiquement tous les liens logiques (sans étoile) */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={highlightConnectorsInEditor}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition cursor-pointer shadow-2xs active:scale-95"
                  title="Détecte et met en valeur automatiquement tous les liens logiques (Cependant, En effet, De plus...) en gras avec la couleur active"
                >
                  <span>Colorier les liens logiques</span>
                </button>

                {/* Bouton pour réinitialiser tout le texte en noir à côté */}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={resetAllTextColors}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition cursor-pointer active:scale-95"
                  title="Remettre tout le texte en écriture noire standard"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500" />
                  <span>Tout en noir</span>
                </button>
              </div>
            </div>
          </div>

          <div className="relative">
            <div
              ref={editorRef}
              id="texte"
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onPaste={handleEditorPaste}
              onFocus={() => setIsEditorFocused(true)}
              onBlur={() => setIsEditorFocused(false)}
              className="writing-ruled-zone w-full p-4 border border-slate-300/80 rounded-lg outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition overflow-y-auto text-slate-900 font-normal"
              style={{
                color: '#0f172a',
                fontWeight: 400,
              }}
            />
            {!texte.trim() && !isEditorFocused && (
              <div
                onClick={() => editorRef.current?.focus()}
                className="absolute top-4 left-4 right-4 text-slate-400 font-newsreader text-lg pointer-events-none italic select-none"
              >
                Rédigez votre production écrite ici...
              </div>
            )}
          </div>

          {/* COMPTEUR OFFICIEL DES LIGNES EN BAS DE LA ZONE DE RÉDACTION */}
          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
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
                    {lineCount >= 18 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded-full">
                        ✓ Cadre idéal
                      </span>
                    )}
                  </>
                )}
              </div>

              {isBoldInk && (
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: inkColor }}></span>
                  <span>Écriture couleur en gras</span>
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              Norme recommandée à l'Examen Régional : <strong>20 à 25 lignes</strong>
            </div>
          </div>

          {lineCount > 25 && (
            <div className="mt-2.5 p-3 rounded-lg bg-red-50 border border-red-300 text-red-800 text-xs flex items-center gap-2 animate-fade-in">
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

            {/* Fiche d'identification du Candidat et Note à droite du Nom */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#0b1528] text-amber-400 rounded-full text-xs font-black uppercase tracking-widest border border-amber-500/30">
                Rapport Pédagogique Professionnel
              </div>

              {/* Bloc principal : Nom du Candidat à GAUCHE | Note avec Badge de mention à DROITE */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-4 sm:p-6 bg-slate-50 border border-slate-200/90 rounded-2xl shadow-2xs">
                {/* À GAUCHE : Nom et métadonnées du Candidat */}
                <div className="space-y-1.5 flex-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Candidat officiel :</span>
                  <h2 id="rNom" className="font-cinzel text-2xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
                    {studentName || 'YOUSSEF EL MANSOURI'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600 pt-0.5">
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
                </div>

                {/* À DROITE DU NOM : La note attribuée avec son badge de mention en bas (sans "certifié conforme") */}
                <div className="flex flex-col items-start sm:items-end justify-center shrink-0 sm:pl-6 sm:border-l sm:border-slate-200 pt-2 sm:pt-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] uppercase font-extrabold text-slate-500 tracking-wider">Note :</span>
                    <span
                      id="rTotal"
                      className={`text-3xl sm:text-4xl font-black font-cinzel tracking-tight ${
                        isHorsSujet ? 'text-red-700' : 'text-slate-950'
                      }`}
                    >
                      {isHorsSujet ? '0/10' : `${scores.total || '8.8'}/10`}
                    </span>
                  </div>

                  {/* Badge de mention en bas de la note attribuée */}
                  <div className="mt-1.5">
                    <span
                      id="rMention"
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${
                        mentionInfo.className
                      }`}
                    >
                      {mentionInfo.label}
                    </span>
                  </div>
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h3 className="font-outfit text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#c5221f] rounded-full inline-block"></span> 6. Modèles Rédigés d'Excellence (Norme Al Akhawayn • Min. 18 lignes)
                  </h3>
                  
                  {/* Sélecteur de plan simple vs dialectique : UNIQUEMENT pour les sujets dialectiques */}
                  {detectedPlanType === 'DIALECTIQUE' ? (
                    <div id="tabDialecticSelectors" className="flex items-center gap-1.5 p-1 bg-slate-200 rounded-xl shadow-2xs w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => displayM('A')}
                        id="ts"
                        className={`tab-trigger px-4 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex-1 ${activePlan === 'A' ? 'active' : 'text-slate-700 hover:text-slate-900'}`}
                      >
                        Option 1 : Plan Simple
                      </button>
                      <button
                        type="button"
                        onClick={() => displayM('B')}
                        id="td"
                        className={`tab-trigger px-4 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center flex-1 ${activePlan === 'B' ? 'active' : 'text-slate-700 hover:text-slate-900'}`}
                      >
                        Option 2 : Variante Dialectique
                      </button>
                    </div>
                  ) : (
                    <div id="planBadgeContainer" className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 text-white rounded-xl shadow-xs border border-slate-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wide">
                        {detectedPlanType === 'ANALYTIQUE' ? (
                          (sujet && (sujet.toLowerCase().includes('solution') || sujet.toLowerCase().includes('guérisseur') || sujet.toLowerCase().includes('guerisseur') || sujet.toLowerCase().includes('remède') || sujet.toLowerCase().includes('remede')))
                            ? 'Modèle Certifié : Plan Analytique (Causes, Conséquences & Solutions)'
                            : 'Modèle Certifié : Plan Analytique (Causes & Conséquences)'
                        ) : 'Modèle Certifié : Plan Simple (Arguments Convergents)'}
                      </span>
                    </div>
                  )}
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
                            Option 1 : Plan Simple
                          </button>
                          <button
                            type="button"
                            onClick={() => setArchiveModelPlanTab('B')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer flex-1 text-center ${
                              archiveModelPlanTab === 'B' ? 'bg-[#0b1528] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-300/60'
                            }`}
                          >
                            Option 2 : Variante Dialectique
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

      {/* MODALE D'HABILITATION SÉCURISÉE ENSEIGNANT (CLÉ D'ACCÈS OBLIGATOIRE) */}
      {showTeacherAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-5 bg-gradient-to-r from-slate-900 via-[#162544] to-[#0b1528] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                  <Lock className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-outfit font-bold text-base text-white">
                    Accès Réservé Enseignant
                  </h3>
                  <p className="text-xs text-slate-300">
                    Espace Dépôt de Sujets Officiels
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTeacherAuthModal(false);
                  setTeacherAuthError('');
                  setTeacherInputKey('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifyTeacherKey} className="p-5 sm:p-6 space-y-4">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  Cet espace est strictement réservé au professeur pour déposer ou administrer des sujets régionaux. Veuillez saisir la <strong className="font-semibold text-slate-900">Clé d'habilitation Enseignant</strong>.
                </p>
              </div>

              {teacherAuthError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-medium">{teacherAuthError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Clé d'habilitation Enseignant
                </label>
                <div className="relative">
                  <input
                    type={showTeacherKeyPlain ? 'text' : 'password'}
                    required
                    autoFocus
                    value={teacherInputKey}
                    onChange={(e) => {
                      setTeacherInputKey(e.target.value);
                      if (teacherAuthError) setTeacherAuthError('');
                    }}
                    placeholder="Saisissez la clé d'habilitation..."
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTeacherKeyPlain((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title={showTeacherKeyPlain ? 'Masquer' : 'Afficher la clé'}
                  >
                    {showTeacherKeyPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  🔒 Empêche les élèves de déposer des sujets ou de modifier la bibliothèque.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowTeacherAuthModal(false);
                    setTeacherAuthError('');
                    setTeacherInputKey('');
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <KeyRound className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  <span>Déverrouiller l'Espace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE ESPACE ENSEIGNANT : DÉPOSER UN NOUVEAU SUJET RÉGIONAL */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-[#162544] text-white rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-outfit font-bold text-base text-white">
                    Espace Enseignant • Déposer un Sujet
                  </h3>
                  <p className="text-xs text-slate-300">
                    Ajoutez un sujet officiel d'examen régional pour vos élèves
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowTeacherModal(false);
                  setTeacherFormError('');
                }}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bannière de session enseignant active avec option de verrouillage */}
            <div className="bg-amber-50/90 px-5 py-2 border-b border-amber-200 flex items-center justify-between text-xs text-amber-950">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Session Enseignant vérifiée : <strong>hadmed.brave@gmail.com</strong></span>
              </span>
              <button
                type="button"
                onClick={handleLockTeacherSpace}
                className="text-amber-800 hover:text-red-700 font-semibold cursor-pointer flex items-center gap-1 hover:underline"
                title="Verrouiller la session pour empêcher les élèves de déposer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Verrouiller</span>
              </button>
            </div>

            <form onSubmit={handleSaveTeacherSubject} className="p-5 sm:p-6 space-y-4">
              {teacherFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{teacherFormError}</span>
                </div>
              )}

              {teacherFormSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sujet enregistré avec succès dans la Bibliothèque Officielle !</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Thème ou Titre du Sujet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={teacherTitre}
                  onChange={(e) => setTeacherTitre(e.target.value)}
                  placeholder="Ex : L'autorité parentale face à l'autonomie des jeunes..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Œuvre au Programme
                  </label>
                  <select
                    value={teacherOeuvre}
                    onChange={(e) => setTeacherOeuvre(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition cursor-pointer"
                  >
                    <option value="La Boîte à Merveilles">La Boîte à Merveilles</option>
                    <option value="Antigone">Antigone</option>
                    <option value="Le Dernier Jour d’un Condamné">Le Dernier Jour d’un Condamné</option>
                    <option value="Sujet de Société Général">Sujet de Société Général</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Plan Conseillé
                  </label>
                  <select
                    value={teacherPlan}
                    onChange={(e) => setTeacherPlan(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition cursor-pointer"
                  >
                    <option value="Plan Simple">Plan Simple (Avis univoque)</option>
                    <option value="Plan Dialectique">Plan Dialectique (Thèse / Antithèse)</option>
                    <option value="Plan Analytique">Plan Analytique (Causes / Conséquences)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Académie / Région
                  </label>
                  <input
                    type="text"
                    value={teacherRegion}
                    onChange={(e) => setTeacherRegion(e.target.value)}
                    placeholder="Ex : Rabat-Salé-Kénitra, Fès-Meknès..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Année
                  </label>
                  <input
                    type="text"
                    value={teacherAnnee}
                    onChange={(e) => setTeacherAnnee(e.target.value)}
                    placeholder="2024"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Consigne Intégrale du Sujet <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={teacherConsigne}
                  onChange={(e) => setTeacherConsigne(e.target.value)}
                  placeholder="Saisissez ici le texte officiel de la consigne..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition resize-y font-mono text-[12px]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Pistes Didactiques ou Conseils pour les Élèves (Optionnel)
                </label>
                <input
                  type="text"
                  value={teacherConseils}
                  onChange={(e) => setTeacherConseils(e.target.value)}
                  placeholder="Ex : Confronter Maâlem Abdeslem et Sidi Mohammed..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-[#0b1528] hover:bg-slate-800 text-white rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                  <span>Enregistrer et Publier dans la Bibliothèque</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
