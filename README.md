# Kursi VIP Registration Wheel (Scaffold)

This project scaffolds a complete post-registration VIP wheel flow:

- modal shown after successful registration
- weighted wheel reward assignment (60/30/10)
- one-time spin guard
- reward persistence in database
- webhook notification on reward creation
- 7-day validity with active/expired handling
- helper utilities for future rate engine integration

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Generate Prisma client and run migration:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name add_wheel_rewards
```

4. Start app:

```bash
npm run dev
```

## Auth integration note

`src/lib/auth.ts` currently reads `x-user-id` from request headers as a placeholder.
Replace it with your real session/auth integration.

## Registration flow integration note

`src/app/register/success/page.tsx` demonstrates where to place
`RegistrationWheelModal`. In your real app, mount it in the page shown immediately
after successful registration.
