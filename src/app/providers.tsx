
'use client';

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppProvider } from "@/contexts/AppContext";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <FirebaseClientProvider>
                <SidebarProvider>
                    <AppProvider>
                        {children}
                        <Toaster />
                    </AppProvider>
                </SidebarProvider>
            </FirebaseClientProvider>
        </NextThemesProvider>
    );
}
