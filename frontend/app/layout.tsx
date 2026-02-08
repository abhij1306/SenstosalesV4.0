import { SidebarNav, ToastProvider, GlobalSearch, ThemeProvider, ThemeToggle, HeaderActions } from "@/components/common/index";
import { Providers } from "@/components/common/Providers";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "SenstoSales - Enterprise Procurement",
    description: "Enterprise procurement and inventory management system",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
            <body
                className="antialiased font-sans flex h-screen overflow-hidden bg-background text-foreground"
            >
                <Providers>
                    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                        <SidebarNav />

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                            {/* Compact Header */}
                            <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-surface shrink-0">
                                <div className="w-full max-w-xs">
                                    <GlobalSearch />
                                </div>
                                <div className="flex items-center gap-2">
                                    <HeaderActions />
                                    <div id="header-action-portal" />
                                    <ThemeToggle />
                                </div>
                            </header>

                            {/* Content */}
                            <main className="flex-1 overflow-y-auto bg-background">
                                <div className="max-w-container mx-auto p-container">
                                    <ToastProvider>{children}</ToastProvider>
                                </div>
                            </main>
                        </div>
                    </ThemeProvider>
                </Providers>
            </body>
        </html>
    );
}
