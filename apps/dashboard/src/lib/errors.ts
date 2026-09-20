import { ApiError, type ApiErrorCode } from './api';

type Lang = 'en' | 'ru';

const MESSAGES: Record<ApiErrorCode, { en: string; ru: string }> = {
  SERVER_DOWN: {
    en: 'Local server is not responding. Try Start Server in the tray, or restart the app.',
    ru: 'Локальный сервер не отвечает. Нажми «Start Server» в трее или перезапусти приложение.',
  },
  NO_PROVIDER: {
    en: 'No AI provider is active. Pick one on the Providers page and click "Make active".',
    ru: 'Не выбран AI-провайдер. Открой страницу Providers и нажми «Сделать активным».',
  },
  PROVIDER_NOT_SIGNED_IN: {
    en: 'You are not signed in to the AI provider. Click "Sign in" on the Providers page.',
    ru: 'Ты не залогинен в AI-провайдере. Нажми «Войти в аккаунт» на странице Providers.',
  },
  RATE_LIMITED: {
    en: 'Too many requests. Wait a bit and try again.',
    ru: 'Слишком много запросов. Подожди и попробуй ещё раз.',
  },
  BAD_REQUEST: {
    en: 'The request was rejected by the server.',
    ru: 'Сервер отклонил запрос.',
  },
  SERVER_ERROR: {
    en: 'Server error. Check the log or restart the server.',
    ru: 'Ошибка на сервере. Посмотри лог или перезапусти сервер.',
  },
  UNKNOWN: {
    en: 'Something went wrong.',
    ru: 'Что-то пошло не так.',
  },
};

export function humanizeError(err: unknown, lang: Lang): string {
  if (err instanceof ApiError) {
    return MESSAGES[err.code][lang];
  }
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    if (m.includes('failed to fetch') || m.includes('network')) return MESSAGES.SERVER_DOWN[lang];
    return err.message;
  }
  return MESSAGES.UNKNOWN[lang];
}
