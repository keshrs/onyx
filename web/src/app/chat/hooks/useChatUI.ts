import { useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChatSession } from '../interfaces';
import { buildChatUrl } from '../lib';
import { SEARCH_PARAM_NAMES } from '../searchParams';

export interface ChatUIManager {
  // UI state
  showHistorySidebar: boolean;
  documentSidebarVisible: boolean;
  proSearchEnabled: boolean;
  userSettingsToggled: boolean;
  settingsToggled: boolean;
  showApiKeyModal: boolean;
  isChatSearchModalOpen: boolean;
  sharingModalVisible: boolean;
  showAssistantsModal: boolean;
  toggleDocSelection: boolean;
  aboveHorizon: boolean;
  untoggled: boolean;
  
  // UI operations
  setShowHistorySidebar: (show: boolean) => void;
  setDocumentSidebarVisible: (visible: boolean) => void;
  setProSearchEnabled: (enabled: boolean) => void;
  setUserSettingsToggled: (toggled: boolean) => void;
  setSettingsToggled: (toggled: boolean) => void;
  setShowApiKeyModal: (show: boolean) => void;
  setIsChatSearchModalOpen: (open: boolean) => void;
  setSharingModalVisible: (visible: boolean) => void;
  setShowAssistantsModal: (show: boolean) => void;
  setToggleDocSelection: (toggle: boolean) => void;
  setAboveHorizon: (above: boolean) => void;
  
  // Sidebar operations
  toggleSidebar: () => void;
  explicitlyUntoggle: () => void;
  removeToggle: () => void;
  toggleDocumentSidebar: () => void;
  
  // Document operations
  clearSelectedDocuments: () => void;
  toggleDocumentSelection: (document: any) => void;
  
  // Modal operations
  showShareModal: (chatSession: ChatSession) => void;
  setSharedChatSession: (session: ChatSession | null) => void;
  
  // Scroll operations
  handleScroll: () => void;
  clientScrollToBottom: (fast?: boolean) => void;
  adjustDocumentSidebarWidth: () => void;
  handleInputResize: () => void;
  
  // Refs
  scrollableDivRef: React.RefObject<HTMLDivElement>;
  lastMessageRef: React.RefObject<HTMLDivElement>;
  endDivRef: React.RefObject<HTMLDivElement>;
  sidebarElementRef: React.RefObject<HTMLDivElement>;
  innerSidebarElementRef: React.RefObject<HTMLDivElement>;
  masterFlexboxRef: React.RefObject<HTMLDivElement>;
  
  // State
  sharedChatSession: ChatSession | null;
  maxDocumentSidebarWidth: number | null;
  waitForScrollRef: React.MutableRefObject<boolean>;
  scrollDist: React.MutableRefObject<number>;
  previousHeight: React.MutableRefObject<number>;
}

export function useChatUI(
  sidebarVisible: boolean,
  toggle: (toggled?: boolean) => void,
  proSearchToggled: boolean,
  shouldShowWelcomeModal: boolean,
  user: any,
  settings: any,
  chatSessionIdRef: React.MutableRefObject<string | null>,
  setPopup: (popup: any) => void,
  // Document operations - these need to be passed from the parent since they depend on external state
  clearSelectedDocuments: () => void,
  toggleDocumentSelection: (document: any) => void,
  // Input refs needed for handleInputResize
  inputRef: React.RefObject<HTMLDivElement>,
  autoScrollEnabled: boolean
): ChatUIManager {
  const router = useRouter();
  
  // UI state
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [documentSidebarVisible, setDocumentSidebarVisible] = useState(false);
  const [proSearchEnabled, setProSearchEnabled] = useState(proSearchToggled);
  const [userSettingsToggled, setUserSettingsToggled] = useState(false);
  const [settingsToggled, setSettingsToggled] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(!shouldShowWelcomeModal);
  const [isChatSearchModalOpen, setIsChatSearchModalOpen] = useState(false);
  const [sharingModalVisible, setSharingModalVisible] = useState(false);
  const [showAssistantsModal, setShowAssistantsModal] = useState(false);
  const [toggleDocSelection, setToggleDocSelection] = useState(false);
  const [aboveHorizon, setAboveHorizon] = useState(false);
  const [untoggled, setUntoggled] = useState(false);
  const [sharedChatSession, setSharedChatSession] = useState<ChatSession | null>(null);
  const [maxDocumentSidebarWidth, setMaxDocumentSidebarWidth] = useState<number | null>(null);
  
  // Refs
  const scrollableDivRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const endDivRef = useRef<HTMLDivElement>(null);
  const sidebarElementRef = useRef<HTMLDivElement>(null);
  const innerSidebarElementRef = useRef<HTMLDivElement>(null);
  const masterFlexboxRef = useRef<HTMLDivElement>(null);
  const waitForScrollRef = useRef(false);
  const scrollDist = useRef(0);
  const previousHeight = useRef(0);

  const toggleSidebar = useCallback(() => {
    if (user?.is_anonymous_user) {
      return;
    }
    toggle();
  }, [user?.is_anonymous_user, toggle]);

  const explicitlyUntoggle = useCallback(() => {
    setShowHistorySidebar(false);
    setUntoggled(true);
    setTimeout(() => {
      setUntoggled(false);
    }, 200);
  }, []);

  const removeToggle = useCallback(() => {
    setShowHistorySidebar(false);
    toggle(false);
  }, [toggle]);

  const toggleDocumentSidebar = useCallback(() => {
    if (!documentSidebarVisible) {
      setDocumentSidebarVisible(true);
    } else {
      setDocumentSidebarVisible(false);
    }
  }, [documentSidebarVisible]);

  const showShareModal = useCallback((chatSession: ChatSession) => {
    setSharedChatSession(chatSession);
  }, []);

  const handleScroll = useCallback(() => {
    const scrollDistance =
      endDivRef?.current?.getBoundingClientRect()?.top! -
      scrollableDivRef?.current?.getBoundingClientRect()?.top!;
    scrollDist.current = scrollDistance;
    setAboveHorizon(scrollDist.current > 800); // HORIZON_DISTANCE
  }, []);

  const clientScrollToBottom = useCallback((fast?: boolean) => {
    waitForScrollRef.current = true;

    setTimeout(() => {
      if (!endDivRef.current || !scrollableDivRef.current) {
        console.error("endDivRef or scrollableDivRef not found");
        return;
      }

      const rect = endDivRef.current.getBoundingClientRect();
      const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;

      if (isVisible) return;

      endDivRef.current.scrollIntoView({
        behavior: fast ? "auto" : "smooth",
      });
    }, 50);

    setTimeout(() => {
      waitForScrollRef.current = false;
    }, 1500);
  }, []);

  const adjustDocumentSidebarWidth = useCallback(() => {
    if (masterFlexboxRef.current && document.documentElement.clientWidth) {
      if (document.documentElement.clientWidth > 1700) {
        setMaxDocumentSidebarWidth(masterFlexboxRef.current.clientWidth - 950);
      } else if (document.documentElement.clientWidth > 1420) {
        setMaxDocumentSidebarWidth(masterFlexboxRef.current.clientWidth - 760);
      } else {
        setMaxDocumentSidebarWidth(masterFlexboxRef.current.clientWidth - 660);
      }
    }
  }, []);

  const handleInputResize = useCallback(() => {
    setTimeout(() => {
      if (
        inputRef.current &&
        lastMessageRef.current &&
        !waitForScrollRef.current
      ) {
        const newHeight: number =
          inputRef.current?.getBoundingClientRect().height!;
        const heightDifference = newHeight - previousHeight.current;
        if (
          previousHeight.current &&
          heightDifference != 0 &&
          scrollableDivRef &&
          scrollableDivRef.current
        ) {
          if (autoScrollEnabled) {
            scrollableDivRef?.current.scrollBy({
              left: 0,
              top: Math.max(heightDifference, 0),
              behavior: "smooth",
            });
          }
        }
        previousHeight.current = newHeight;
      }
    }, 100);
  }, [inputRef, autoScrollEnabled]);

  return {
    showHistorySidebar,
    documentSidebarVisible,
    proSearchEnabled,
    userSettingsToggled,
    settingsToggled,
    showApiKeyModal,
    isChatSearchModalOpen,
    sharingModalVisible,
    showAssistantsModal,
    toggleDocSelection,
    aboveHorizon,
    untoggled,
    setShowHistorySidebar,
    setDocumentSidebarVisible,
    setProSearchEnabled,
    setUserSettingsToggled,
    setSettingsToggled,
    setShowApiKeyModal,
    setIsChatSearchModalOpen,
    setSharingModalVisible,
    setShowAssistantsModal,
    setToggleDocSelection,
    setAboveHorizon,
    toggleSidebar,
    explicitlyUntoggle,
    removeToggle,
    toggleDocumentSidebar,
    clearSelectedDocuments,
    toggleDocumentSelection,
    showShareModal,
    setSharedChatSession,
    handleScroll,
    clientScrollToBottom,
    adjustDocumentSidebarWidth,
    handleInputResize,
    scrollableDivRef,
    lastMessageRef,
    endDivRef,
    sidebarElementRef,
    innerSidebarElementRef,
    masterFlexboxRef,
    sharedChatSession,
    maxDocumentSidebarWidth,
    waitForScrollRef,
    scrollDist,
    previousHeight,
  };
} 