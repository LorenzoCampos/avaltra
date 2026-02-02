import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Importar traducciones EN
import commonEN from './locales/en/common.json';
import navigationEN from './locales/en/navigation.json';
import authEN from './locales/en/auth.json';
import dashboardEN from './locales/en/dashboard.json';
import expensesEN from './locales/en/expenses.json';
import incomesEN from './locales/en/incomes.json';
import activityEN from './locales/en/activity.json';
import settingsEN from './locales/en/settings.json';
import accountsEN from './locales/en/accounts.json';
import categoriesEN from './locales/en/categories.json';
import savingsEN from './locales/en/savings.json';
import reportsEN from './locales/en/reports.json';
import recurringEN from './locales/en/recurring.json';
import onboardingEN from './locales/en/onboarding.json';

// Importar traducciones ES
import commonES from './locales/es/common.json';
import navigationES from './locales/es/navigation.json';
import authES from './locales/es/auth.json';
import dashboardES from './locales/es/dashboard.json';
import expensesES from './locales/es/expenses.json';
import incomesES from './locales/es/incomes.json';
import activityES from './locales/es/activity.json';
import settingsES from './locales/es/settings.json';
import accountsES from './locales/es/accounts.json';
import categoriesES from './locales/es/categories.json';
import savingsES from './locales/es/savings.json';
import reportsES from './locales/es/reports.json';
import recurringES from './locales/es/recurring.json';
import onboardingES from './locales/es/onboarding.json';

i18n
  .use(LanguageDetector) // Detecta idioma del browser
  .use(initReactI18next) // React integration
  .init({
    resources: {
      en: {
        common: commonEN,
        navigation: navigationEN,
        auth: authEN,
        dashboard: dashboardEN,
        expenses: expensesEN,
        incomes: incomesEN,
        activity: activityEN,
        settings: settingsEN,
        accounts: accountsEN,
        categories: categoriesEN,
        savings: savingsEN,
        reports: reportsEN,
        recurring: recurringEN,
        onboarding: onboardingEN,
      },
      es: {
        common: commonES,
        navigation: navigationES,
        auth: authES,
        dashboard: dashboardES,
        expenses: expensesES,
        incomes: incomesES,
        activity: activityES,
        settings: settingsES,
        accounts: accountsES,
        categories: categoriesES,
        savings: savingsES,
        reports: reportsES,
        recurring: recurringES,
        onboarding: onboardingES,
      },
    },
    fallbackLng: 'es', // Default: Español (target rioplatense)
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React ya escapa HTML
    },
    detection: {
      // Orden de detección
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Guardar preferencia en localStorage
      caches: ['localStorage'],
      lookupLocalStorage: 'preferred_language',
    },
    // Debug en desarrollo
    debug: import.meta.env.DEV,
  });

export default i18n;
