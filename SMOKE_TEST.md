# Smoke Test — Browser AI Bridge

Пошаговая проверка «как обычный пользователь»: скачал с GitHub → поднял → пообщался с AI → убедился, что всё работает.

Отмечай пункты по мере прохождения: `[x]`.

---

## 0. Перед началом

Требования:

- **Node.js 20+** (рекомендуется 22) — `node --version`
- **Google Chrome** (или Edge) — нужен для браузерного режима
- Залогиненный аккаунт хотя бы в одном: Gemini / ChatGPT / Claude / DeepSeek
- **git** — для клонирования

## 1. Скачать и подготовить

```bash
git clone https://github.com/negrin22899/browser-ai-bridge.git
cd browser-ai-bridge
npm install
npm run build
```

Ожидание: сборка заканчивается без ошибок (`exit 0`).

- [ ] `npm install` прошёл
- [ ] `npm run build` прошёл без ошибок

> С этого момента команды запускаются как `node apps/cli/dist/index.js <command>`.
> Если `bab` установлен глобально (`npm i -g @bab/cli` или `npm link`), можно писать просто `bab <command>`.

## 2. Проверка системы (`doctor`)

```bash
node apps/cli/dist/index.js doctor
```

Ожидание: все пункты `✔ ok`, в идеале нет `✗`.

- [ ] Node, Playwright, Chrome, профиль — ok
- [ ] Нет критических ошибок

## 3. Запуск сервера

```bash
node apps/cli/dist/index.js serve --site gemini
```

Ожидание: в логе `Browser AI Bridge running at http://localhost:3000`, браузер открывает/подключает Gemini.

Проверь API (в другом терминале):

```bash
curl http://localhost:3000/health
curl http://localhost:3000/v1/providers
curl http://localhost:3000/v1/tools
```

- [ ] `/health` отвечает (статус `ok` или честный `degraded`)
- [ ] `/v1/providers` показывает провайдера `gemini`
- [ ] `/v1/tools` показывает реальные тулы (fs.read, git.status, shell.exec...)

## 4. Дашборд

В другом терминале:

```bash
npm run dashboard
```

Открой **http://localhost:5173**.

- [ ] Дашборд открывается, тёмная тема без белой вспышки
- [ ] Слева видны страницы: Chat, Sessions, Providers, Debugger, Settings

## 5. Живой диалог (главная проверка)

В дашборде на странице **Chat** отправь сообщение, например:

> Привет, напиши короткий список из трёх пунктов о себе.

Ожидание:

- [ ] Ответ приходит **от реального Gemini** (не заглушка)
- [ ] Текст адекватный, не пустой
- [ ] Внизу можно отправить ещё сообщение и продолжить разговор

> Это единственное, что нельзя проверить автоматически — нужен твой залогиненный браузер.
> Если ответ пустой/завис — см. раздел «Если что-то не работает».

## 6. История чатов и экспорт

- [ ] В Chat есть дропдаун «История» — прошлый чат можно загрузить
- [ ] Кнопка «Новый чат» сбрасывает контекст
- [ ] На странице **Sessions** видна сессия со счётчиком сообщений
- [ ] Экспорт в **markdown** скачивает файл
- [ ] Экспорт в **JSON** скачивает файл
- [ ] Прогресс-бар контекста есть и не красный на коротком чате

## 7. AI Debugger

Открой **http://localhost:5173/#/debugger**, отправь запрос через Chat.

- [ ] В Debugger видно timeline: `request.received` → итерации → тулы → финальный ответ
- [ ] Кнопки «Пауза» и «Очистить» работают

## 8. Командный режим (RBAC)

```bash
node apps/cli/dist/index.js team add tester --role member
```

Команда напечатает ключ (`bab-...`). Сохрани его, потом:

```bash
curl http://localhost:3000/v1/providers                          # → 401 (без ключа)
curl -H "Authorization: Bearer <КЛЮЧ>" http://localhost:3000/v1/providers   # → 200
node apps/cli/dist/index.js team list
```

- [ ] Без ключа API отдаёт `401`
- [ ] С ключом — `200`
- [ ] `team list` показывает клиента
- [ ] `team revoke <id>` отзывает ключ (после — снова `401`)

> Командный режим включается флагом `--team` у `serve`. Без него авторизация не требуется.

## 9. Мульти-аккаунт ротация

Останови сервер, запусти с двумя аккаунтами:

```bash
node apps/cli/dist/index.js serve --site gemini --accounts 2
```

- [ ] Сервер стартует, в логе «across 2 accounts»
- [ ] Второй профиль создаётся в `~/.browser-ai-bridge/profiles/gemini-account-2`
- [ ] Первый аккаунт использует твой обычный залогиненный профиль

## 10. PWA (установка как приложение)

На открытом дашборде (Chrome):

- [ ] В адресной строке есть иконка «Установить» (или в меню → «Установить приложение»)
- [ ] Устанавливается, открывается в отдельном окне без вкладок
- [ ] Иконка BAB отображается корректно

## 11. Плагины

```bash
node apps/cli/dist/index.js plugin list
```

- [ ] Показывает 4 установленных провайдер-плагина
- [ ] Показывает «Available in marketplace» (provider-gemini/chatgpt/claude/deepseek)

## 12. Диагностика одним файлом

```bash
node apps/cli/dist/index.js diagnose --output ./diag.json
```

- [ ] Файл `diag.json` создан
- [ ] Внутри: system, node, npm, playwright, git, doctor — без секретов

---

## Сводный чек-лист

- [ ] Шаг 1 — сборка зелёная
- [ ] Шаг 2 — `doctor` зелёный
- [ ] Шаг 3 — сервер + `/health` + `/v1/providers` + `/v1/tools`
- [ ] Шаг 4 — дашборд открылся
- [ ] Шаг 5 — **живой ответ от AI** (ключевой пункт)
- [ ] Шаг 6 — история + экспорт md/json
- [ ] Шаг 7 — Debugger timeline
- [ ] Шаг 8 — RBAC: 401/200/revoke
- [ ] Шаг 9 — `--accounts 2`
- [ ] Шаг 10 — PWA установка
- [ ] Шаг 11 — `plugin list`
- [ ] Шаг 12 — `diagnose --output`

---

## Если что-то не работает

**Ответ пустой или сервер молчит в браузерном режиме**
- Проверь, что Chrome не заблокирован другим процессом (`doctor` покажет профиль).
- Попробуй `serve --site gemini --no-headless`, чтобы видеть браузер своими глазами.
- Попробуй `--no-profile` (свежий профиль) — это изолирует проблему логина/профиля.
- Если сайт поменял разметку/эндпоинты — это та самая «живая сверка CDP», которую я не мог сделать за тебя: сообщи, какой провайдер и что приходит в Network.

**Порт занят**
```bash
node apps/cli/dist/index.js serve --site gemini --port 8080
```
и для дашборда укажи API: `VITE_API_URL=http://localhost:8080 npm run dashboard`.

**401 на всех запросах**
- Значит, сервер запущен с `--team`, а ключ не передан. Убери `--team` или добавь `Authorization: Bearer <ключ>`.

**Куда писать об ошибках**
- `~/.browser-ai-bridge/logs/bab-YYYY-MM-DD.log` — логи
- `~/.browser-ai-bridge/crashes/crash-*.json` — краш-репорты
- Приложи `diagnose --output diag.json` к баг-репорту.
