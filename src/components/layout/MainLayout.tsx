"use client";

import React, { ReactNode, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, CandlestickChart, Settings2, TrendingUp, ClipboardList, PanelLeftClose, PanelRightOpen, Target, BrainCircuit, Book, HeartPulse, BookMarked, BookCopy, BookCheck, GitCompareArrows, Mail, Zap, History, BookText, Clock, BookOpenCheck, GitBranch, TrendingDown, ClipboardSignature, Download, Upload, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppProvider, useAppContext } from '@/contexts/AppContext';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarGroupLabel,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { ModeToggle } from './ModeToggle';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/journal-entry', label: 'Journal Entry', icon: BookText },
  { href: '/link', label: 'Time Blocks', icon: Clock },
  { href: '/logical-blocks', label: 'Logical Blocks', icon: GitBranch },
  { href: '/trades', label: 'Trades', icon: CandlestickChart },
  { href: '/strategies', label: 'Edges', icon: Settings2 },
  { href: '/short-edges', label: 'Short Edge', icon: TrendingDown },
  { href: '/logical-edge-flow', label: 'Logical Edge Flow', icon: GitBranch },
  { href: '/formulas', label: 'Formulas', icon: ClipboardList },
  { href: '/short-formulas', label: 'Short Formulas', icon: ClipboardSignature },
  { href: '/market-journal', label: 'Market Journal', icon: BookOpenCheck },
  { href: '/calculator', label: 'Calculator', icon: Target },
  { href: '/analytics', label: 'Analytics', icon: BrainCircuit },
  { href: '/reports', label: 'Reports', icon: Book },
  { href: '/abstract-report', label: 'Abstract Report', icon: ClipboardSignature },
  { href: '/activity', label: 'Day\'s Activity', icon: History },
  { href: '/psychology', label: 'Psychology', icon: HeartPulse },
  { href: '/psychology-dashboard', label: 'Psychology Dashboard', icon: HeartPulse },
  { href: '/trading-book', label: 'Trading Diary', icon: BookMarked },
  { href: '/divergence', label: 'Divergence Dashboard', icon: GitCompareArrows },
  { href: '/divergence/analytics', label: 'Divergence Analytics', icon: BrainCircuit },
  { href: '/divergence/calculator', label: 'Divergence Calculator', icon: Target },
  { href: '/divergence/reports', label: 'Divergence Reports', icon: Book },
];

function MainLayoutContent({ 
  children, 
  headerRightContent,
  headerCenterContent,
  headerFarRightContent,
}: { 
  children: React.ReactNode; 
  headerRightContent?: ReactNode;
  headerCenterContent?: ReactNode;
  headerFarRightContent?: ReactNode;
}) {
  const pathname = usePathname();
  const { toggleSidebar, open } = useSidebar();
  const { tradingMode, setTradingMode, getAllDataAsJson, importBackup } = useAppContext();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const getPageTitle = useCallback(() => {
    const allNavItems = [...navItems];
    const sortedNavItems = allNavItems.sort((a, b) => b.href.length - a.href.length);
    const activeItem = sortedNavItems.find(item => {
      if (item.href === '/') {
        return pathname === '/';
      }
      return pathname.startsWith(item.href);
    });
    return activeItem?.label || 'Dashboard'; 
  }, [pathname]);
  
  useEffect(() => {
    if (isMounted) {
      const pageTitle = getPageTitle();
      const mode = tradingMode.charAt(0).toUpperCase() + tradingMode.slice(1);
      document.title = `${mode} - ${pageTitle}`;
    }
  }, [pathname, tradingMode, getPageTitle, isMounted]);
  
  const handleBackupToEmail = () => {
    try {
      const jsonString = getAllDataAsJson();
      const subject = `TradeVision Backup - ${new Date().toLocaleString()}`;
      
      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(jsonString)}`;

      if (mailtoLink.length > 2000) {
        toast({
          variant: "destructive",
          title: "Data Too Large for Email",
          description: "Your data is too large to send via this method. Please use the Download Backup feature instead.",
        });
        return;
      }

      window.location.href = mailtoLink;
      
    } catch (error) {
      console.error("Error creating email backup:", error);
      toast({
        variant: "destructive",
        title: "Backup Failed",
        description: "Could not prepare your data for email backup.",
      });
    }
  };

  const handleDownloadBackup = () => {
    try {
        const jsonString = getAllDataAsJson();
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `tradevision_full_backup_${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({
            title: "Backup Downloaded",
            description: "Your data has been saved to a JSON file.",
        });
    } catch (error) {
        console.error("Error creating download backup:", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "Could not prepare your data for download.",
        });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    importBackup(file);

    // Reset the file input so the same file can be selected again
    event.target.value = '';
  };


  const filteredNavItems = useMemo(() => {
    if (tradingMode === 'theoretical') {
      return navItems.filter(item => 
        item.href !== '/journal-entry' && 
        item.href !== '/link'
      );
    }
    // tradingMode === 'real'
     return navItems.filter(item => 
        item.href !== '/psychology' && 
        item.href !== '/trading-book'
    );
  }, [tradingMode]);


  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".json"
      />
      <Sidebar collapsible="icon" variant="sidebar" className="bg-sidebar text-sidebar-foreground">
        <SidebarHeader>
          <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
            <SidebarMenuButton
              asChild
              className="h-auto justify-start p-0 hover:bg-transparent group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10"
              variant="ghost"
              size="lg"
              tooltip={{ children: "TradeVision Home", side: "right", className:"ml-2" }}
            >
              <Link href="/" className="flex items-center gap-2 px-2 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
                <TrendingUp className="h-7 w-7 text-sidebar-primary group-data-[collapsible=icon]:h-6 group-data-[collapsible=icon]:w-6" />
                <span className="text-xl font-headline font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                  TradeVision
                </span>
              </Link>
            </SidebarMenuButton>
          </div>
          {isMounted && (
            <div className="group-data-[collapsible=icon]:px-0 px-2">
              <div className="flex h-9 w-full items-center justify-center rounded-md bg-muted p-1 group-data-[collapsible=icon]:hidden">
                <Button
                  size="sm"
                  onClick={() => setTradingMode('real')}
                  className={cn(
                    "flex-1 h-full text-xs",
                    tradingMode === 'real'
                      ? 'bg-background text-foreground shadow-sm hover:bg-background'
                      : 'bg-transparent text-muted-foreground shadow-none hover:bg-background/50'
                  )}
                >
                  Real
                </Button>
                <Button
                  size="sm"
                  onClick={() => setTradingMode('theoretical')}
                  className={cn(
                    "flex-1 h-full text-xs",
                    tradingMode === 'theoretical'
                      ? 'bg-background text-foreground shadow-sm hover:bg-background'
                      : 'bg-transparent text-muted-foreground shadow-none hover:bg-background/50'
                  )}
                >
                  Theoretical
                </Button>
              </div>

              <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-y-1">
                <SidebarMenuButton
                    isActive={tradingMode === 'real'}
                    onClick={() => setTradingMode('real')}
                    tooltip={{ children: "Real Trading", side: "right", className: "ml-2" }}
                    className="h-8 w-8"
                  >
                    <BookCheck />
                </SidebarMenuButton>
                <SidebarMenuButton
                    isActive={tradingMode === 'theoretical'}
                    onClick={() => setTradingMode('theoretical')}
                    tooltip={{ children: "Theoretical Trading", side: "right", className: "ml-2" }}
                    className="h-8 w-8"
                  >
                    <BookCopy />
                </SidebarMenuButton>
              </div>
            </div>
          )}
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {isMounted && filteredNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)}
                  tooltip={{ children: item.label, side: "right", className:"ml-2" }}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
             <SidebarMenuItem>
                <SidebarMenuButton
                    onClick={handleDownloadBackup}
                    tooltip={{ children: "Download Full Backup", side: "right", className: "ml-2" }}
                >
                    <Download />
                    <span>Download Backup</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton
                    onClick={handleImportClick}
                    tooltip={{ children: "Import Full Backup", side: "right", className: "ml-2" }}
                >
                    <Upload />
                    <span>Import Backup</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleBackupToEmail}
                tooltip={{ children: "Backup Data via Email", side: "right", className: "ml-2" }}
              >
                <Mail />
                <span>Email Backup</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <ModeToggle />
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <div className="relative flex h-full flex-col">
            <header className="sticky top-0 z-30 flex h-14 lg:h-[60px] items-center gap-4 border-b bg-card px-6 shrink-0">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={toggleSidebar}>
                {open ? <PanelLeftClose /> : <PanelRightOpen />}
                <span className="sr-only">Toggle Sidebar</span>
            </Button>
            
            <div className="flex-1 flex items-center gap-4">
                <div className="flex-1 flex items-center justify-start gap-4">
                  {isMounted && (
                    <h2 className="text-xl font-headline font-semibold mr-4">
                        {getPageTitle()}
                    </h2>
                  )}
                  {headerCenterContent}
                </div>

                <div className="flex justify-end items-center gap-2 overflow-x-auto">
                  {headerRightContent}
                  {headerFarRightContent && (
                    <>
                      <div className="mx-2 h-6 w-px bg-border" />
                      {headerFarRightContent}
                    </>
                  )}
                </div>
            </div>
            </header>
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-background">
                {children}
              </div>
            </div>
        </div>
      </SidebarInset>
    </>
  );
}

export default function MainLayout(props: any) {
  return (
    <AppProvider>
      <MainLayoutContent {...props} />
    </AppProvider>
  )
}
