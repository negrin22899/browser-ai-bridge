# Security Threat Model — Browser AI Bridge

> Version: 1.0.0  
> Date: 2026-08-10  
> Status: Accepted

---

## Цепочка доверия

```
AI Service (НЕ ДОВЕРЕННЫЙ)
      ↓
Browser (ПОСРЕДНИК)
      ↓
Bridge Runtime (НАШ КОД)
      ↓
Local Machine (ПОЛЬЗОВАТЕЛЬ)
```

**Принцип: AI — не доверенный источник инструкций.**

---

## Сценарии угроз

### 1. Prompt Injection

**Threat:** AI генерирует инструкции, которые побуждают Runtime выполнить опасные действия.

**Attack Surface:** Response от AI провайдера.

**Required Permission:** Зависит от инструкции (fs.write, shell.exec, etc.)

**Protection:**
- Permission Engine проверяет каждое действие
- Dangerous commands требуют подтверждения пользователя
- System prompt ограничивает возможности AI
- Runtime не выполняет инструкции напрямую — только через Tool Dispatch

**Audit Event:** `tool.requested`, `permission.requested`, `permission.denied`

---

### 2. Вредоносный репозиторий

**Threat:** Репозиторий содержит файлы, которые манипулируют AI (например, .cursorrules с prompt injection).

**Attack Surface:** Файлы в workspace, читаемые AI.

**Required Permission:** `fs.read`

**Protection:**
- Workspace restrictions — Runtime работает только в разрешённых директориях
- System prompt не доверяет содержимому файлов как инструкциям
- Audit log фиксирует все чтения файлов

**Audit Event:** `tool.executed` с `toolName: fs.read`

---

### 3. Выход за пределы Workspace

**Threat:** AI пытается прочитать/записать файлы за пределами разрешённого workspace.

**Attack Surface:** Tool calls с абсолютными путями или `../`

**Required Permission:** `fs.read`, `fs.write`

**Protection:**
- Permission Engine проверяет `allowedPaths`
- Пути нормализуются перед проверкой
- `../` и символические ссылки разрешаются только в пределах workspace
- Попытки выхода — denied + audit

**Audit Event:** `permission.denied` с `reason: path_outside_workspace`

---

### 4. Опасные shell-команды

**Threat:** AI пытается выполнить `rm -rf`, `sudo`, `format`, и т.д.

**Attack Surface:** Tool calls к `shell.exec`

**Required Permission:** `shell.exec` (confirm mode)

**Protection:**
- `deniedCommands` блокирует опасные команды автоматически
- Shell.exec требует подтверждения пользователя по умолчанию
- Команды парсятся и проверяются перед выполнением
- Audit log фиксирует все попытки

**Audit Event:** `permission.denied` с `reason: denied_by_rule`

---

### 5. Скомпрометированный Plugin

**Threat:** Plugin содержит вредоносный код или получает больше权限 чем нужно.

**Attack Surface:** Plugin initialize(), Plugin execute()

**Required Permission:** Plugin capabilities (объявлены в manifest)

**Protection:**
- Plugin Trust Model (Untrusted → Sandboxed → Trusted)
- Plugin получает только declared capabilities
- Permission Engine ограничивает доступ
- Plugin actions логируются
- Revocation — можно отозвать permissions

**Audit Event:** `plugin.loaded`, `tool.executed` с `pluginId`

---

### 6. Cross-session доступ

**Threat:** Одна сессия пытается получить доступ к данным другой сессии.

**Attack Surface:** Session ID guessing, shared state

**Required Permission:** Session-scoped permissions

**Protection:**
- Каждая сессия имеет уникальный ID
- Permissions привязаны к сессии
- Runtime state изолирован между сессиями
- Нет shared mutable state между сессиями

**Audit Event:** `session.created`, `session.closed`

---

### 7. Утечка секретов

**Threat:** Credentials, tokens, API keys попадают в логи, recorder, или error messages.

**Attack Surface:** Logs, Recorder, Replay, Diagnose, Error messages

**Required Permission:** N/A

**Protection:**
- Credential Boundary — BAB не хранит credentials
- Redaction/sanitization перед записью
- Паттерн: `secret=abc123` → `secret=[REDACTED]`
- Recorder не сохраняет cookies/tokens/auth state
- Error messages не содержат чувствительных данных

**Audit Event:** `data.redacted` (при обнаружении чувствительных данных)

---

### 8. SSRF через Runtime

**Threat:** AI пытается заставить Runtime сделать запрос к внутренним сервисам.

**Attack Surface:** Tool calls с URL параметрами

**Required Permission:** Зависит от tool (network access)

**Protection:**
- Network access ограничен по умолчанию
- URL whitelist для разрешённых хостов
- Нет прямого HTTP tool — все запросы через браузер
- Audit log фиксирует все network operations

**Audit Event:** `tool.executed` с `toolName: network.*`

---

### 9. Произвольный доступ к файлам

**Threat:** AI пытается прочитать /etc/passwd, ~/.ssh/id_rsa, и т.д.

**Attack Surface:** Tool calls к fs.read с абсолютными путями

**Required Permission:** `fs.read`

**Protection:**
- `allowedPaths` ограничивает доступные директория
- Системные файлы (/etc, /proc, etc.) заблокированы по умолчанию
- Домашняя директория — только явно разрешённые поддиректории
- Audit log фиксирует все чтения

**Audit Event:** `permission.denied` с `reason: path_not_allowed`

---

## Матрица угроз

| Сценарий | Severity | Likelihood | Risk | Protection Status |
|----------|----------|------------|------|-------------------|
| Prompt Injection | High | High | Critical | ✅ Protected |
| Вредоносный репозиторий | Medium | Medium | Medium | ✅ Protected |
| Выход за Workspace | High | Medium | High | ✅ Protected |
| Опасные shell-команды | Critical | Low | High | ✅ Protected |
| Скомпрометированный Plugin | High | Low | Medium | ⚠️ Partial |
| Cross-session доступ | Medium | Low | Low | ✅ Protected |
| Утечка секретов | High | Medium | High | ⚠️ Partial |
| SSRF | Medium | Low | Low | ✅ Protected |
| Произвольный доступ к файлам | High | Medium | High | ✅ Protected |

---

## Рекомендации

### Немедленные (v1.0)
1. ✅ Permission Engine работает
2. ✅ Audit logging работает
3. ⚠️ Добавить redaction для credential boundary
4. ⚠️ Добавить path normalization для workspace restrictions

### Краткосрочные (v1.1)
1. Plugin Trust Model — формализовать уровни
2. Credential Boundary — проверить все точки вывода
3. Observability — trace_id для всех запросов

### Среднесрочные (v1.2+)
1. Plugin sandboxing
2. Network restrictions
3. Advanced audit analysis

---

## Ссылки

- [Permission Engine](../packages/runtime/src/permission-engine.ts)
- [Audit Logger](../packages/runtime/src/audit-logger.ts)
- [Capabilities](../packages/protocol/src/types/capabilities.ts)
- [ARCHITECTURE_DECISIONS.md](../ARCHITECTURE_DECISIONS.md)
