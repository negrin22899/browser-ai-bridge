# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x-alpha | ✅ |
| < 0.2.0 | ❌ |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email: [security@example.com] (replace with actual email)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix or mitigation**: Within 2 weeks (critical), 1 month (other)

## Security Measures

### Token Storage

**No tokens are stored on disk.** All authentication happens through the browser.

### Permission System

- **Scope-based permissions** restrict tool access
- **Auto/Confirm/Deny** modes for different operation types
- **Dangerous operations** always require user confirmation

### Browser Automation

- Playwright runs in isolated browser contexts
- No access to user's browsing data
- Browser sessions are ephemeral

### Network

- All communication is local (localhost only)
- No external API calls without user consent
- CORS enabled for local development

### Dependencies

- Regular `npm audit` checks
- Minimal dependency tree
- No known critical vulnerabilities

## Security Best Practices

### For Users

1. Keep Browser AI Bridge updated
2. Review permission requests carefully
3. Don't run with elevated privileges unnecessarily
4. Use strong passwords for AI service accounts

### For Developers

1. Never commit secrets or tokens
2. Use environment variables for configuration
3. Validate all user inputs
4. Follow principle of least privilege
5. Run `npm audit` before releasing

## Known Security Limitations

See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) for current security limitations.

## Security Contacts

- GitHub Security Advisories: [Enable in repository settings]
- Email: [security@example.com] (replace with actual email)

## Acknowledgments

We感谢 security researchers who responsibly disclose vulnerabilities.
