/**
 * Every user-facing string, per language. `en` is the source of truth: its keys define
 * `TranslationKey`, and the other languages must provide the same keys (type-checked).
 * Add a language: add it to `LANGUAGES` and a dictionary here.
 */
const en = {
  'app.name': 'Language Tutor',
  'app.loading': 'Loading…',

  'nav.schedule': 'Schedule',
  'nav.students': 'Students',
  'nav.about': 'About',
  'nav.menu': 'Menu',

  'account.title': 'Account',
  'account.version': 'Version',
  'account.language': 'Language',
  'account.update': 'Update',
  'account.logout': 'Log out',

  'login.google': 'Continue with Google',
  'login.apple': 'Continue with Apple',
  'login.legalPrefix': 'By continuing, you agree to our',
  'login.terms': 'Terms of Service',
  'login.and': 'and',
  'login.privacy': 'Privacy Policy',

  'about.description':
    'A lightweight scheduling app for teachers — plan lessons, track students and keep your week organized.',

  'schedule.today': 'Today',
  'schedule.addLesson': 'Add lesson',
  'schedule.noEvents': 'No Events',

  'students.search': 'Search',
  'students.add': 'Add student',
  'students.new': 'New Student',
  'students.edit': 'Edit Student',
  'students.name': 'Name *',
  'students.email': 'Email',
  'students.phone': 'Phone',
  'students.level': 'Level',
  'students.empty': 'No Students',
  'students.notFound': 'Nothing found',

  'lesson.new': 'New Lesson',
  'lesson.edit': 'Edit Lesson',
  'lesson.title': 'Title',
  'lesson.student': 'Student',
  'lesson.note': 'Note',
  'lesson.starts': 'Starts',
  'lesson.ends': 'Ends',
  'lesson.status': 'Status',
  'lesson.status.Scheduled': 'Scheduled',
  'lesson.status.Done': 'Done',
  'lesson.status.Cancelled': 'Cancelled',

  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.delete': 'Delete',
  'action.back': 'Back',
  'action.discard': 'Discard',

  'picker.selectDate': 'Select date…',
  'picker.selectTime': 'Select time…',
  'picker.select': 'Select…',
  'picker.prevMonth': 'Previous month',
  'picker.nextMonth': 'Next month',
};

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;

const pl: Dictionary = {
  'app.name': 'Language Tutor',
  'app.loading': 'Ładowanie…',

  'nav.schedule': 'Plan',
  'nav.students': 'Uczniowie',
  'nav.about': 'O aplikacji',
  'nav.menu': 'Menu',

  'account.title': 'Konto',
  'account.version': 'Wersja',
  'account.language': 'Język',
  'account.update': 'Aktualizuj',
  'account.logout': 'Wyloguj się',

  'login.google': 'Kontynuuj z Google',
  'login.apple': 'Kontynuuj z Apple',
  'login.legalPrefix': 'Kontynuując, akceptujesz',
  'login.terms': 'Regulamin',
  'login.and': 'oraz',
  'login.privacy': 'Politykę prywatności',

  'about.description':
    'Prosta aplikacja do planowania dla nauczycieli — planuj lekcje, śledź uczniów i miej porządek w tygodniu.',

  'schedule.today': 'Dziś',
  'schedule.addLesson': 'Dodaj lekcję',
  'schedule.noEvents': 'Brak wydarzeń',

  'students.search': 'Szukaj',
  'students.add': 'Dodaj ucznia',
  'students.new': 'Nowy uczeń',
  'students.edit': 'Edytuj ucznia',
  'students.name': 'Imię i nazwisko *',
  'students.email': 'E-mail',
  'students.phone': 'Telefon',
  'students.level': 'Poziom',
  'students.empty': 'Brak uczniów',
  'students.notFound': 'Nic nie znaleziono',

  'lesson.new': 'Nowa lekcja',
  'lesson.edit': 'Edytuj lekcję',
  'lesson.title': 'Tytuł',
  'lesson.student': 'Uczeń',
  'lesson.note': 'Notatka',
  'lesson.starts': 'Początek',
  'lesson.ends': 'Koniec',
  'lesson.status': 'Status',
  'lesson.status.Scheduled': 'Zaplanowana',
  'lesson.status.Done': 'Odbyta',
  'lesson.status.Cancelled': 'Odwołana',

  'action.save': 'Zapisz',
  'action.cancel': 'Anuluj',
  'action.delete': 'Usuń',
  'action.back': 'Wstecz',
  'action.discard': 'Odrzuć',

  'picker.selectDate': 'Wybierz datę…',
  'picker.selectTime': 'Wybierz godzinę…',
  'picker.select': 'Wybierz…',
  'picker.prevMonth': 'Poprzedni miesiąc',
  'picker.nextMonth': 'Następny miesiąc',
};

const fr: Dictionary = {
  'app.name': 'Language Tutor',
  'app.loading': 'Chargement…',

  'nav.schedule': 'Planning',
  'nav.students': 'Élèves',
  'nav.about': 'À propos',
  'nav.menu': 'Menu',

  'account.title': 'Compte',
  'account.version': 'Version',
  'account.language': 'Langue',
  'account.update': 'Mettre à jour',
  'account.logout': 'Se déconnecter',

  'login.google': 'Continuer avec Google',
  'login.apple': 'Continuer avec Apple',
  'login.legalPrefix': 'En continuant, vous acceptez nos',
  'login.terms': 'Conditions d’utilisation',
  'login.and': 'et notre',
  'login.privacy': 'Politique de confidentialité',

  'about.description':
    'Une application de planification légère pour les enseignants — planifiez vos cours, suivez vos élèves et organisez votre semaine.',

  'schedule.today': 'Aujourd’hui',
  'schedule.addLesson': 'Ajouter un cours',
  'schedule.noEvents': 'Aucun événement',

  'students.search': 'Rechercher',
  'students.add': 'Ajouter un élève',
  'students.new': 'Nouvel élève',
  'students.edit': 'Modifier l’élève',
  'students.name': 'Nom *',
  'students.email': 'E-mail',
  'students.phone': 'Téléphone',
  'students.level': 'Niveau',
  'students.empty': 'Aucun élève',
  'students.notFound': 'Aucun résultat',

  'lesson.new': 'Nouveau cours',
  'lesson.edit': 'Modifier le cours',
  'lesson.title': 'Titre',
  'lesson.student': 'Élève',
  'lesson.note': 'Note',
  'lesson.starts': 'Début',
  'lesson.ends': 'Fin',
  'lesson.status': 'Statut',
  'lesson.status.Scheduled': 'Prévu',
  'lesson.status.Done': 'Terminé',
  'lesson.status.Cancelled': 'Annulé',

  'action.save': 'Enregistrer',
  'action.cancel': 'Annuler',
  'action.delete': 'Supprimer',
  'action.back': 'Retour',
  'action.discard': 'Abandonner',

  'picker.selectDate': 'Choisir une date…',
  'picker.selectTime': 'Choisir une heure…',
  'picker.select': 'Choisir…',
  'picker.prevMonth': 'Mois précédent',
  'picker.nextMonth': 'Mois suivant',
};

export const LANGUAGES = [
  { code: 'en', label: 'English', locale: 'en-US' },
  { code: 'pl', label: 'Polski', locale: 'pl-PL' },
  { code: 'fr', label: 'Français', locale: 'fr-FR' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const DICTIONARIES: Record<LanguageCode, Dictionary> = { en, pl, fr };
