import React from 'react';
import { HealthCheckBanner } from '@/components/health/healthcheck';
import FixedLogo from '@/components/logo/FixedLogo';
import BlurBackground from '@/components/chat/BlurBackground';
import { HistorySidebar } from '../sessionSidebar/HistorySidebar';
import { DocumentResults } from '../documentSidebar/DocumentResults';
import FunctionalHeader from '@/components/chat/Header';
import { ChatSession, Persona } from '../../admin/assistants/interfaces';
import { OnyxDocument } from '@/lib/search/interfaces';

interface ChatLayoutProps {
  // Sidebar state
  sidebarVisible: boolean;
  showHistorySidebar: boolean;
  documentSidebarVisible: boolean;
  untoggled: boolean;
  
  // Sidebar refs
  sidebarElementRef: React.RefObject<HTMLDivElement>;
  innerSidebarElementRef: React.RefObject<HTMLDivElement>;
  
  // Sidebar actions
  toggleSidebar: () => void;
  explicitlyUntoggle: () => void;
  removeToggle: () => void;
  setShowAssistantsModal: (show: boolean) => void;
  setIsChatSearchModalOpen: (open: boolean) => void;
  reset: () => void;
  showShareModal: (chatSession: ChatSession) => void;
  
  // Document sidebar props
  selectedDocuments: OnyxDocument[];
  toggleDocumentSelection: (document: OnyxDocument) => void;
  clearSelectedDocuments: () => void;
  selectedDocumentTokens: number;
  maxTokens: number;
  selectedMessageForDocDisplay: number | null;
  setSelectedMessageForDocDisplay: (messageId: number | null) => void;
  setPresentingDocument: (document: any) => void;
  
  // Chat context
  liveAssistant: Persona | undefined;
  selectedChatSession: ChatSession | undefined;
  chatSessions: ChatSession[];
  folders: any[];
  
  // Settings
  settings: any;
  
  // Children
  children: React.ReactNode;
}

export function ChatLayout({
  sidebarVisible,
  showHistorySidebar,
  documentSidebarVisible,
  untoggled,
  sidebarElementRef,
  innerSidebarElementRef,
  toggleSidebar,
  explicitlyUntoggle,
  removeToggle,
  setShowAssistantsModal,
  setIsChatSearchModalOpen,
  reset,
  showShareModal,
  selectedDocuments,
  toggleDocumentSelection,
  clearSelectedDocuments,
  selectedDocumentTokens,
  maxTokens,
  selectedMessageForDocDisplay,
  setSelectedMessageForDocDisplay,
  setPresentingDocument,
  liveAssistant,
  selectedChatSession,
  chatSessions,
  folders,
  settings,
  children,
}: ChatLayoutProps) {
  return (
    <div className="fixed inset-0 flex flex-col text-text-dark">
      <div className="h-[100dvh] overflow-y-hidden">
        <div className="w-full">
          {/* History Sidebar */}
          <div
            ref={sidebarElementRef}
            className={`
              flex-none
              fixed
              left-0
              z-40
              bg-neutral-200
              h-screen
              transition-all
              bg-opacity-80
              duration-300
              ease-in-out
              ${
                !untoggled && (showHistorySidebar || sidebarVisible)
                  ? "opacity-100 w-[250px] translate-x-0"
                  : "opacity-0 w-[250px] pointer-events-none -translate-x-10"
              }`}
          >
            <div className="w-full relative">
              <HistorySidebar
                toggleChatSessionSearchModal={() =>
                  setIsChatSearchModalOpen((open: boolean) => !open)
                }
                liveAssistant={liveAssistant}
                setShowAssistantsModal={setShowAssistantsModal}
                explicitlyUntoggle={explicitlyUntoggle}
                reset={reset}
                page="chat"
                ref={innerSidebarElementRef}
                toggleSidebar={toggleSidebar}
                toggled={sidebarVisible}
                existingChats={chatSessions}
                currentChatSession={selectedChatSession}
                folders={folders}
                removeToggle={removeToggle}
                showShareModal={showShareModal}
              />
            </div>

            {/* Document Sidebar Background */}
            <div
              className={`
              flex-none
              fixed
              left-0
              z-40
              bg-background-100
              h-screen
              transition-all
              bg-opacity-80
              duration-300
              ease-in-out
              ${
                documentSidebarVisible &&
                !settings?.isMobile &&
                "opacity-100 w-[350px]"
              }`}
            />
          </div>
        </div>

        {/* Document Sidebar */}
        <div
          style={{ transition: "width 0.30s ease-out" }}
          className={`
              flex-none 
              fixed
              right-0
              z-[1000]
              h-screen
              transition-all
              duration-300
              ease-in-out
              bg-transparent
              transition-all
              duration-300
              ease-in-out
              h-full
              ${
                documentSidebarVisible && !settings?.isMobile
                  ? "w-[400px]"
                  : "w-[0px]"
              }
          `}
        >
          <DocumentResults
            humanMessage={null}
            agenticMessage={false}
            setPresentingDocument={setPresentingDocument}
            modal={false}
            ref={innerSidebarElementRef}
            closeSidebar={() =>
              setTimeout(() => {
                // This would need to be passed as a prop
              }, 300)
            }
            selectedMessage={null}
            selectedDocuments={selectedDocuments}
            toggleDocumentSelection={toggleDocumentSelection}
            clearSelectedDocuments={clearSelectedDocuments}
            selectedDocumentTokens={selectedDocumentTokens}
            maxTokens={maxTokens}
            initialWidth={400}
            isOpen={documentSidebarVisible && !settings?.isMobile}
          />
        </div>

        {/* Blur Background */}
        <BlurBackground
          visible={!untoggled && (showHistorySidebar || sidebarVisible)}
          onClick={() => toggleSidebar()}
        />

        {/* Main Content */}
        <div className="flex h-full w-full overflow-x-hidden">
          <div
            id="scrollableContainer"
            className="flex h-full relative px-2 flex-col w-full"
          >
            {/* Header */}
            {liveAssistant && (
              <FunctionalHeader
                toggleUserSettings={() => {
                  // This would need to be passed as a prop
                }}
                sidebarToggled={sidebarVisible}
                reset={() => {
                  // This would need to be passed as a prop
                }}
                page="chat"
                setSharingModalVisible={undefined}
                documentSidebarVisible={
                  documentSidebarVisible && !settings?.isMobile
                }
                toggleSidebar={toggleSidebar}
                currentChatSession={selectedChatSession}
                hideUserDropdown={false}
              />
            )}

            {/* Main Content Area */}
            {children}
          </div>
        </div>
        
        {/* Fixed Logo */}
        <FixedLogo backgroundToggled={sidebarVisible || showHistorySidebar} />
      </div>
    </div>
  );
} 