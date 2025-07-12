# SkillSwap - Skill Exchange Platform

A modern web application for connecting people who want to exchange skills and knowledge. Built with React, TypeScript, Vite, and Supabase.

## 🚀 Features

### Core Features
- **Skill Exchange**: Connect with others to teach and learn skills
- **User Profiles**: Create detailed profiles with skills you can offer and want to learn
- **Request System**: Send and manage skill swap requests
- **Rating System**: Rate and review your skill exchange experiences
- **Real-time Chat**: Communicate with other users during skill exchanges
- **Browse Skills**: Discover skills offered by the community

### Admin Features
- **User Management**: View and manage all users
- **Skill Moderation**: Approve or reject skills submitted by users
- **User Banning**: Ban users who violate community guidelines
- **Platform Messages**: Send announcements to all users
- **Report Management**: Download user reports and analytics
- **Swap Monitoring**: Monitor ongoing skill exchanges

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: Shadcn/ui, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: React Context API
- **Routing**: React Router DOM
- **Icons**: Lucide React

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd swap-skills-connect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the migrations in the `supabase/migrations/` folder
   - Copy your Supabase URL and anon key

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:8080`

## 👥 User Roles

### Regular User
- Create and manage profile
- Offer skills and request to learn skills
- Send and receive skill swap requests
- Rate and review experiences
- Chat with other users

### Admin User
- All regular user features
- Access to admin dashboard
- User management and moderation
- Platform-wide announcements
- Analytics and reporting

## 🔐 Admin Role Setup

### During Signup
1. Go to the signup page (`/auth`)
2. Fill in your details
3. Select "Admin" as account type
4. Complete the signup process

### For Existing Users
If you need to grant admin access to an existing user:

1. **Using Debug Tools** (Temporary):
   - Login as the user
   - Click "Debug Admin" button in the header
   - This will manually set the admin role

2. **Database Method**:
   ```sql
   INSERT INTO public.user_roles (user_id, role) 
   VALUES ('user-uuid-here', 'admin')
   ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
   ```

### Debug Tools
The application includes debug tools for troubleshooting admin role issues:

- **Debug Admin**: Manually set admin role for current user
- **Clear Cache**: Clear cached role data and force fresh fetch
- **Check Metadata**: View user metadata to verify role assignment

## 🏗️ Project Structure

```
swap-skills-connect/
├── src/
│   ├── components/
│   │   └── ui/                 # Shadcn/ui components
│   ├── hooks/
│   │   ├── useAuth.tsx         # Authentication and role management
│   │   └── use-mobile.tsx      # Mobile detection hook
│   ├── integrations/
│   │   └── supabase/           # Supabase client and types
│   ├── pages/
│   │   ├── Admin.tsx           # Admin dashboard
│   │   ├── Auth.tsx            # Login/signup page
│   │   ├── Dashboard.tsx       # User dashboard
│   │   └── ...                 # Other pages
│   └── main.tsx                # App entry point
├── supabase/
│   └── migrations/             # Database migrations
└── public/                     # Static assets
```

## 🔧 Key Components

### Authentication System (`useAuth.tsx`)
- Handles user authentication with Supabase
- Manages user roles (admin/user)
- Provides role-based access control
- Includes role caching and fallback mechanisms

### Admin Dashboard (`Admin.tsx`)
- User management interface
- Skill moderation tools
- Platform message system
- Analytics and reporting

### Role Management
The system uses multiple layers to ensure proper role assignment:

1. **Database Trigger**: Automatically assigns roles during signup
2. **Metadata Check**: Verifies role from user metadata
3. **Manual Override**: Debug tools for manual role assignment
4. **Caching**: Performance optimization with role caching

## 🐛 Troubleshooting

### Admin Role Not Working
1. **Clear role cache**: Use "Clear Cache" debug button
2. **Check user metadata**: Use "Check Metadata" debug button
3. **Manual role assignment**: Use "Debug Admin" button
4. **Check browser console**: Look for role-related logs

### Common Issues
- **Role cache conflicts**: Clear localStorage and refresh
- **Database trigger issues**: Check Supabase logs
- **Vite Fast Refresh issues**: Restart dev server

## 📊 Database Schema

### Key Tables
- `profiles`: User profile information
- `user_roles`: User role assignments
- `skills`: Skills offered by users
- `skill_requests`: Skill exchange requests
- `ratings`: User ratings and feedback
- `messages`: Chat messages between users

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel/Netlify
1. Connect your repository
2. Set environment variables
3. Deploy automatically on push

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review browser console logs
3. Check Supabase dashboard for database issues
4. Use debug tools for role-related problems

---

**Note**: This is a development version with debug tools enabled. Remove debug buttons before production deployment.
