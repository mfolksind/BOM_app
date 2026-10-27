import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Mfolks ERP - Admin Management Console",
  description: "Manufacturing & Job-Work Operations Admin Control Panel",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${jakartaSans.variable} h-full antialiased light`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans text-[15px] selection:bg-slate-900 selection:text-white">
        <TooltipProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
