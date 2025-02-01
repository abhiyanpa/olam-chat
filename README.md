# Olam Chat

A modern real-time chat application built with React, TypeScript, and Supabase.

## Live Demo
<img width="956" alt="{16F3E133-282F-4C85-84D8-A17587307B77}" src="https://github.com/user-attachments/assets/861b493b-2db8-47f0-ab61-15e5f2fa2c8a" />

Visit the live application: [https://olam.abhiyanpa.in](https://olam.abhiyanpa.in)

## Features

- 🚀 Real-time messaging
- 🔒 Secure authentication
- 👤 User profiles
- 🔍 User search
- 📱 Responsive design
- 🌙 Dark mode
- ✨ Message status indicators
- 🎯 Message delivery confirmation
- 📲 Push notifications (coming soon)

## Tech Stack

- React
- TypeScript
- Tailwind CSS
- Supabase
- React Router
- Lucide Icons

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/abhiyanpa/olam-chat.git
cd olam-chat
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

## Environment Setup

Make sure you have the following installed:
- Node.js (v16 or later)
- npm or yarn
- Git

## Database Schema

The application uses Supabase with the following tables:

- profiles
  - id (uuid)
  - username (text)
  - avatar_url (text)
  - online (boolean)
  - last_seen (timestamp)

- private_messages
  - id (uuid)
  - content (text)
  - sender_id (uuid)
  - receiver_id (uuid)
  - created_at (timestamp)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
