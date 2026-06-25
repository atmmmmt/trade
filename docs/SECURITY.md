# Security Rules

## Secrets

Never commit private credentials:

- Exchange API key.
- Exchange API secret.
- Telegram bot token.
- Server passwords.
- Private keys.

Use `.env` locally and environment variables on the server.

## API Key Rules

During early development:

- Use sandbox/testnet keys only.
- Keep withdrawal permission disabled.
- Use a dedicated key for this project.
- Restrict the key by server IP when possible.
- Rotate keys if they are ever exposed.

## Operating Rules

- The system starts in `signal` mode by default.
- Phase 1 is analysis only.
- Future account actions must check the risk guard first.
- Add an emergency stop before sandbox account actions.
- Logs must not print secrets.
