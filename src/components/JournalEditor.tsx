'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlock from '@tiptap/extension-code-block';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Underline as UnderlineIcon, Highlighter, CheckSquare, Code, AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Download, Trash2, Maximize, Minimize } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { encryptEntry } from '@/lib/crypto/core';
import sodium from 'libsodium-wrappers-sumo';
import { convert } from 'html-to-text';
import { saveAs } from 'file-saver';
import { ConfirmDialog, PromptDialog, AlertDialog } from './ui/Dialogs';

interface JournalEditorProps {
  encKey: Uint8Array;
  // In a full implementation, we'd load existing entries. For MVP, we start fresh.
  initialTitle?: string;
  initialContent?: string; 
  initialMood?: string;
  initialWeather?: string;
  entryId?: string;
  onDelete?: () => void;
  onSaveSuccess?: (id: string) => void;
}

const MOODS = ['😌', '😊', '😂', '😎', '🤔', '😔', '😭', '😡', '😴', '🤯'];
const WEATHERS = ['☀️', '🌤️', '☁️', '🌧️', '⛈️', '🌨️', '💨', '🌫️'];

const ToolbarButton = ({ onClick, isActive, disabled, children }: { onClick: () => void, isActive?: boolean, disabled?: boolean, children: React.ReactNode }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`p-2 rounded-full transition-colors ${disabled ? 'opacity-30 cursor-not-allowed' : ''} ${isActive ? 'bg-black/10 dark:bg-white/10 text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-neutral-900 dark:hover:text-neutral-100'}`}
    type="button"
  >
    {children}
  </button>
);

const extensions = [
  StarterKit.configure({
    codeBlock: false,
    underline: false,
    link: false,
  }),
  Placeholder.configure({
    placeholder: 'Write your thoughts here...',
    emptyEditorClass: 'is-editor-empty',
  }),
  Underline,
  Highlight,
  TaskList,
  TaskItem.configure({ nested: true }),
  CodeBlock,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Link.configure({ openOnClick: false }),
];

export function JournalEditor({ encKey, initialTitle = '', initialContent = '', initialMood = '', initialWeather = '', entryId: initialEntryId, onDelete, onSaveSuccess }: JournalEditorProps) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [entryId, setEntryId] = useState<string | undefined>(initialEntryId);
  const [title, setTitle] = useState(initialTitle);
  const [mood, setMood] = useState(initialMood);
  const [weather, setWeather] = useState(initialWeather);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editorFont, setEditorFont] = useState('editor-font-sans');

  useEffect(() => {
    const handleFontUpdate = () => {
      const font = window.localStorage.getItem('editorFont') || 'editor-font-sans';
      setEditorFont(font);
    };
    handleFontUpdate();
    window.addEventListener('settings_updated', handleFontUpdate);
    return () => window.removeEventListener('settings_updated', handleFontUpdate);
  }, []);
  
  const saveMutation = trpc.entry.saveEntry.useMutation();
  const deleteMutation = trpc.entry.deleteEntry.useMutation();
  const trpcUtils = trpc.useUtils();

  // Debounce ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedWordCountRef = useRef<number>(0);
  
  // Track latest state so we can flush saves on unmount or entry switch
  const stateRef = useRef({ 
    title, 
    content: initialContent, 
    mood,
    weather,
    entryId, 
    saveStatus: 'saved' as 'saved' | 'saving' | 'error' | 'unsaved' 
  });

  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-neutral max-w-none focus:outline-none min-h-[500px]',
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus('unsaved');
      
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Autosave after 2000ms of inactivity
      debounceTimerRef.current = setTimeout(() => {
        handleSave(title, editor.getHTML(), mood, weather);
      }, 2000);
    },
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setSaveStatus('unsaved');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      handleSave(e.target.value, editor?.getHTML() || '', mood, weather);
    }, 2000);
  };

  const handleMoodChange = (newMood: string) => {
    const val = mood === newMood ? '' : newMood;
    setMood(val);
    setSaveStatus('unsaved');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handleSave(title, editor?.getHTML() || '', val, weather);
    }, 2000);
  };

  const handleWeatherChange = (newWeather: string) => {
    const val = weather === newWeather ? '' : newWeather;
    setWeather(val);
    setSaveStatus('unsaved');
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handleSave(title, editor?.getHTML() || '', mood, val);
    }, 2000);
  };

  // Keep stateRef in sync with the latest state
  useEffect(() => {
    stateRef.current = { title, content: editor?.getHTML() || '', mood, weather, entryId, saveStatus };
  }, [title, editor, mood, weather, entryId, saveStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleSave = async (currentTitle: string, htmlContent: string, currentMood: string, currentWeather: string, targetEntryId?: string) => {
    const isBackgroundSave = targetEntryId !== undefined;
    const saveId = isBackgroundSave ? targetEntryId : entryId;
    
    // Convert html to plain text to count words
    const plainText = convert(htmlContent, { wordwrap: false });
    const currentWordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;
    const wordCountDiff = currentWordCount - lastSavedWordCountRef.current;
    
    if (!isBackgroundSave) setSaveStatus('saving');
    try {
      const payload = JSON.stringify({ title: currentTitle, content: htmlContent, mood: currentMood, weather: currentWeather });
      const { ciphertext, nonce } = encryptEntry(payload, encKey);
      const today = new Date().toISOString().split('T')[0];

      const result = await saveMutation.mutateAsync({
        id: saveId,
        ciphertext: sodium.to_hex(ciphertext),
        nonce: sodium.to_hex(nonce),
        date: today,
        wordCountDiff
      });

      lastSavedWordCountRef.current = currentWordCount;

      if (!isBackgroundSave) {
        if (!entryId && result.id) {
          setEntryId(result.id);
          if (onSaveSuccess) onSaveSuccess(result.id);
        }
        setSaveStatus('saved');
      }
      trpcUtils.entry.invalidate();
    } catch (error) {
      console.error('Autosave failed:', error);
      if (!isBackgroundSave) setSaveStatus('error');
    }
  };

  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);



  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isLinkPromptOpen, setIsLinkPromptOpen] = useState(false);
  const [linkPromptDefault, setLinkPromptDefault] = useState('');
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string } | null>(null);

  const confirmDelete = async () => {
    if (!entryId) return;
    setIsDeleting(true);
    try {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      await deleteMutation.mutateAsync({ 
        id: entryId,
        wordCountToSubtract: lastSavedWordCountRef.current 
      });
      trpcUtils.entry.invalidate();
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Failed to delete entry', error);
      setAlertMessage({ title: 'Error', message: 'Failed to delete entry' });
      setIsDeleting(false);
    }
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const downloadTxt = () => {
    if (!editor) return;
    const plainText = convert(editor.getHTML(), { wordwrap: 130 });
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const filename = (title.trim() || 'Untitled_Entry').replace(/[^a-z0-9]/gi, '_') + '.txt';
    saveAs(blob, filename);
  };

  // Cleanup timeout and flush any pending saves on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (stateRef.current.saveStatus === 'unsaved') {
        handleSaveRef.current(stateRef.current.title, stateRef.current.content, stateRef.current.mood, stateRef.current.weather, stateRef.current.entryId);
      }
    };
  }, []);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    setLinkPromptDefault(previousUrl || '');
    setIsLinkPromptOpen(true);
  };

  const confirmLink = (url: string) => {
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={
      isFullscreen
        ? "fixed inset-0 z-[60] bg-[#f8f7f4] dark:bg-[#0a0a12] p-4 sm:p-8 overflow-y-auto flex flex-col"
        : "w-full max-w-4xl mx-auto flex flex-col"
    }>
      <div className={`flex flex-col space-y-4 w-full ${isFullscreen ? 'max-w-6xl mx-auto flex-1' : ''}`}>
      
      {/* Meta Bar: Mood & Weather */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
        <div className="bg-white dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-full p-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none flex items-center space-x-1 overflow-x-auto hide-scrollbar">
          <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-widest pl-3 pr-2">Mood</span>
          {MOODS.map(m => (
            <button
              key={m}
              onClick={() => handleMoodChange(m)}
              className={`p-1.5 rounded-full text-lg transition-all ${mood === m ? 'bg-black/5 dark:bg-white/10 scale-110' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02] grayscale hover:grayscale-0 opacity-50 hover:opacity-100'}`}
              title="Set Mood"
            >
              {m}
            </button>
          ))}
        </div>
        <div className="bg-white dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-full p-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none flex items-center space-x-1 overflow-x-auto hide-scrollbar">
          <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-widest pl-3 pr-2">Weather</span>
          {WEATHERS.map(w => (
            <button
              key={w}
              onClick={() => handleWeatherChange(w)}
              className={`p-1.5 rounded-full text-lg transition-all ${weather === w ? 'bg-black/5 dark:bg-white/10 scale-110' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02] grayscale hover:grayscale-0 opacity-50 hover:opacity-100'}`}
              title="Set Weather"
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Title Input & Save Status */}
      <div className="flex items-center justify-between space-x-4 mt-6 mb-2">
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Entry Title..."
          className="w-full bg-transparent text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 placeholder-neutral-300 dark:placeholder-neutral-800 focus:outline-none"
        />
        
        {/* Status Indicator */}
        <button 
          onClick={() => {
            if (saveStatus !== 'saved' && saveStatus !== 'saving') {
              if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
              handleSave(title, editor.getHTML(), mood, weather);
            }
          }}
          disabled={saveStatus === 'saved' || saveStatus === 'saving'}
          className={`flex-shrink-0 flex items-center space-x-2 whitespace-nowrap px-4 py-2 rounded-full border border-black/5 dark:border-white/5 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none transition-colors ${
            saveStatus !== 'saved' && saveStatus !== 'saving' ? 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer active:scale-95' : 'cursor-default'
          }`}
          title={saveStatus === 'unsaved' || saveStatus === 'error' ? 'Click to save now' : ''}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${
            saveStatus === 'saved' ? 'bg-neutral-300 dark:bg-neutral-600' :
            saveStatus === 'saving' ? 'bg-amber-500 animate-pulse' :
            saveStatus === 'error' ? 'bg-red-500' :
            'bg-amber-500'
          }`} />
          <span className="text-[10px] font-mono font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-500 mt-px">
            {saveStatus === 'saved' && '[ SAVED ]'}
            {saveStatus === 'saving' && '[ ENCRYPTING ]'}
            {saveStatus === 'unsaved' && '[ UNSAVED ]'}
            {saveStatus === 'error' && '[ ERROR - RETRY ]'}
          </span>
        </button>
      </div>
      {/* Toolbar */}
      <div className="sticky top-4 z-10 flex items-center justify-between bg-white/60 dark:bg-black/40 backdrop-blur-xl border border-black/5 dark:border-white/5 p-1.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-none mb-6">
        <div className="flex items-center space-x-1 overflow-x-auto custom-scrollbar whitespace-nowrap min-w-0 pr-2">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
          </ToolbarButton>

          <div className="w-px h-6 bg-neutral-100 dark:bg-neutral-800 mx-1" />
          
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
            <Italic size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')}>
            <UnderlineIcon size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')}>
            <Highlighter size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={setLink} isActive={editor.isActive('link')}>
            <LinkIcon size={16} />
          </ToolbarButton>
          
          <div className="w-px h-6 bg-neutral-100 dark:bg-neutral-800 mx-1" />
          
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })}>
            <Heading1 size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })}>
            <Heading2 size={16} />
          </ToolbarButton>
          
          <div className="w-px h-6 bg-neutral-100 dark:bg-neutral-800 mx-1" />

          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })}>
            <AlignLeft size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })}>
            <AlignCenter size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })}>
            <AlignRight size={16} />
          </ToolbarButton>

          <div className="w-px h-6 bg-neutral-100 dark:bg-neutral-800 mx-1" />

          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>
            <List size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}>
            <ListOrdered size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')}>
            <CheckSquare size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')}>
            <Quote size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')}>
            <Code size={16} />
          </ToolbarButton>
          
          <div className="w-px h-6 bg-neutral-100 dark:bg-neutral-800 mx-1" />
          
          <button 
            onClick={downloadTxt}
            title="Download as .txt"
            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center space-x-1"
          >
            <Download size={16} />
          </button>

          {entryId && (
            <button 
              onClick={handleDelete}
              title="Delete entry"
              disabled={isDeleting}
              className={`p-2 text-neutral-600 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors flex items-center space-x-1 ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Fixed Right side */}
        <div className="flex-shrink-0 flex items-center space-x-1 pl-2 ml-2 border-l border-neutral-200 dark:border-neutral-800">
          <ToolbarButton onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </ToolbarButton>
        </div>
      </div>

      {/* Editor Content */}
      <div className={`bg-white dark:bg-[#12121e] border border-black/[0.04] dark:border-white/5 rounded-3xl p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-none overflow-y-auto custom-scrollbar w-full ${
        isFullscreen ? 'flex-1 min-h-[70vh] max-h-none' : 'min-h-[60vh] max-h-[75vh]'
      } ${editorFont}`} onClick={() => editor.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete Entry"
        message="Are you sure you want to delete this entry? This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
        onConfirm={confirmDelete}
        onClose={() => setIsDeleteConfirmOpen(false)}
      />

      <PromptDialog
        isOpen={isLinkPromptOpen}
        title="Insert Link"
        label="URL"
        defaultValue={linkPromptDefault}
        confirmText="Save Link"
        onConfirm={confirmLink}
        onClose={() => setIsLinkPromptOpen(false)}
      />

      <AlertDialog
        isOpen={!!alertMessage}
        title={alertMessage?.title || 'Alert'}
        message={alertMessage?.message || ''}
        onConfirm={() => setAlertMessage(null)}
      />
    </div>
  );
}
