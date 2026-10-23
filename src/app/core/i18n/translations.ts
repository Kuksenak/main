/**
 * Every user-facing string, per language. `en` is the source of truth: its keys define
 * `TranslationKey`, and the other languages must provide the same keys (type-checked).
 * Add a language: add it to `LANGUAGES` and a dictionary here.
 */
const en = {
  'app.name': 'Language Tutor',
  'app.loading': 'Loading…',
  'app.rotate': 'Turn your phone upright',
  'nav.home': 'Home',
  'nav.menu': 'Sections',
  'action.back': 'Back',
  'nav.schedule': 'Schedule',
  'schedule.today': 'Today',
  'account.title': 'Account',
  'account.logout': 'Log out',
  'account.logoutEverywhere': 'Log out of all devices',
  'account.language': 'Language',
  'account.update': 'Update available',
  'login.google': 'Continue with Google',
  'login.denied': 'Sign-in was cancelled. Try again.',
  'login.unverified': 'Your Google account’s email isn’t confirmed. Confirm it with Google, then sign in again.',
  'login.unavailable': 'The server is unavailable right now. Please try again in a few minutes.',
  'login.apple': 'Continue with Apple',
  'login.legalPrefix': 'By continuing, you agree to our',
  'login.terms': 'Terms of Service',
  'login.and': 'and',
  'login.privacy': 'Privacy Policy',
};

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;

const pl: Dictionary = {
  'app.name': 'Language Tutor',
  'app.loading': 'Ładowanie…',
  'app.rotate': 'Obróć telefon pionowo',
  'nav.home': 'Start',
  'nav.menu': 'Sekcje',
  'action.back': 'Wstecz',
  'nav.schedule': 'Plan',
  'schedule.today': 'Dziś',
  'account.title': 'Konto',
  'account.logout': 'Wyloguj się',
  'account.logoutEverywhere': 'Wyloguj się ze wszystkich urządzeń',
  'account.language': 'Język',
  'account.update': 'Dostępna aktualizacja',
  'login.google': 'Kontynuuj z Google',
  'login.denied': 'Logowanie zostało przerwane. Spróbuj ponownie.',
  'login.unverified': 'Adres e-mail Twojego konta Google nie jest potwierdzony. Potwierdź go w Google i zaloguj się ponownie.',
  'login.unavailable': 'Serwer jest teraz niedostępny. Spróbuj ponownie za kilka minut.',
  'login.apple': 'Kontynuuj z Apple',
  'login.legalPrefix': 'Kontynuując, akceptujesz',
  'login.terms': 'Regulamin',
  'login.and': 'oraz',
  'login.privacy': 'Politykę prywatności',
};

const fr: Dictionary = {
  'app.name': 'Language Tutor',
  'app.loading': 'Chargement…',
  'app.rotate': 'Tournez votre téléphone à la verticale',
  'nav.home': 'Accueil',
  'nav.menu': 'Rubriques',
  'action.back': 'Retour',
  'nav.schedule': 'Planning',
  'schedule.today': 'Aujourd’hui',
  'account.title': 'Compte',
  'account.logout': 'Se déconnecter',
  'account.logoutEverywhere': 'Se déconnecter de tous les appareils',
  'account.language': 'Langue',
  'account.update': 'Mise à jour disponible',
  'login.google': 'Continuer avec Google',
  'login.denied': 'Connexion interrompue. Réessayez.',
  'login.unverified': 'L’adresse e-mail de votre compte Google n’est pas confirmée. Confirmez-la auprès de Google, puis reconnectez-vous.',
  'login.unavailable': 'Le serveur est indisponible pour le moment. Réessayez dans quelques minutes.',
  'login.apple': 'Continuer avec Apple',
  'login.legalPrefix': 'En continuant, vous acceptez nos',
  'login.terms': 'Conditions d’utilisation',
  'login.and': 'et notre',
  'login.privacy': 'Politique de confidentialité',
};

export const LANGUAGES = [
  { code: 'en', label: 'English', locale: 'en-US' },
  { code: 'pl', label: 'Polski', locale: 'pl-PL' },
  { code: 'fr', label: 'Français', locale: 'fr-FR' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const DICTIONARIES: Record<LanguageCode, Dictionary> = { en, pl, fr };
