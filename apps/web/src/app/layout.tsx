import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { OnboardingProvider } from '@/hooks/useOnboarding'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Maskwise - PII Detection & Anonymization Platform',
  description: 'On-premise PII detection and anonymization platform built on Microsoft Presidio',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <OnboardingProvider>
            {children}
            <Toaster />
          </OnboardingProvider>
        </AuthProvider>
      </body>
    </html>
  )
}