/**
 * Every user-facing string, per language. `en` is the source of truth: its keys define
 * `TranslationKey`, and the other languages must provide the same keys (type-checked).
 * Add a language: add it to `LANGUAGES` and a dictionary here.
 */
const en = {
  'app.name': 'Language Tutor',
  'app.loading': 'Loading…',

  'nav.schedule': 'Schedule',
  'nav.about': 'About',
  'nav.menu': 'Menu',

  'account.title': 'Account',
  'account.version': 'Version',
  'account.language': 'Language',
  'account.updateAvailable': 'Update available',
  'account.logout': 'Log out',

  'login.welcome': 'Welcome',
  'login.google': 'Log in with Google',

  'about.description':
    'A lightweight scheduling app for teachers — plan lessons, track students and keep your week organized.',

  'schedule.today': 'Today',
  'schedule.addLesson': 'Add lesson',
  'schedule.noEvents': 'No Events',

  'lesson.new': 'New Lesson',
  'lesson.edit': 'Edit Lesson',
  'lesson.studentName': 'Student name *',
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
  'nav.about': 'O aplikacji',
  'nav.menu': 'Menu',

  'account.title': 'Konto',
  'account.version': 'Wersja',
  'account.language': 'Język',
  'account.updateAvailable': 'Dostępna aktualizacja',
  'account.logout': 'Wyloguj się',

  'login.welcome': 'Witaj',
  'login.google': 'Zaloguj się przez Google',

  'about.description':
    'Prosta aplikacja do planowania dla nauczycieli — planuj lekcje, śledź uczniów i miej porządek w tygodniu.',

  'schedule.today': 'Dziś',
  'schedule.addLesson': 'Dodaj lekcję',
  'schedule.noEvents': 'Brak wydarzeń',

  'lesson.new': 'Nowa lekcja',
  'lesson.edit': 'Edytuj lekcję',
  'lesson.studentName': 'Imię ucznia *',
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
  'nav.about': 'À propos',
  'nav.menu': 'Menu',

  'account.title': 'Compte',
  'account.version': 'Version',
  'account.language': 'Langue',
  'account.updateAvailable': 'Mise à jour disponible',
  'account.logout': 'Se déconnecter',

  'login.welcome': 'Bienvenue',
  'login.google': 'Se connecter avec Google',

  'about.description':
    'Une application de planification légère pour les enseignants — planifiez vos cours, suivez vos élèves et organisez votre semaine.',

  'schedule.today': 'Aujourd’hui',
  'schedule.addLesson': 'Ajouter un cours',
  'schedule.noEvents': 'Aucun événement',

  'lesson.new': 'Nouveau cours',
  'lesson.edit': 'Modifier le cours',
  'lesson.studentName': 'Nom de l’élève *',
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
