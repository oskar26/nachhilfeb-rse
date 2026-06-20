import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import { 
    Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
    Heading1, Heading2, Heading3, 
    List, ListOrdered, AlignLeft, AlignCenter, AlignRight,
    Quote, Maximize2, Minimize2, Image as ImageIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextStyle,
            Color,
            Image.configure({
                inline: true,
                allowBase64: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none min-h-[200px] outline-none p-4 text-sm',
                'data-placeholder': placeholder || '',
            },
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    const addImage = () => {
        const url = window.prompt('Bild-URL (z.B. https://...):');
        if (url && editor) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    if (!editor) return null;

    const toggleFullscreen = () => setIsExpanded(!isExpanded);

    return (
        <div className={cn(
            "border rounded-md overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700 transition-all flex flex-col",
            isExpanded ? "fixed inset-4 z-50 shadow-2xl" : "relative",
            className
        )}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700 sticky top-0 z-10">
                <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleBold().run()} 
                    active={editor.isActive('bold')} 
                    icon={<Bold size={16} />} title="Fett" 
                />
                <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleItalic().run()} 
                    active={editor.isActive('italic')} 
                    icon={<Italic size={16} />} title="Kursiv" 
                />
                <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleUnderline().run()} 
                    active={editor.isActive('underline')} 
                    icon={<UnderlineIcon size={16} />} title="Unterstrichen" 
                />
                <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleStrike().run()} 
                    active={editor.isActive('strike')} 
                    icon={<Strikethrough size={16} />} title="Durchgestrichen" 
                />
                
                <Sep />
                
                <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
                    active={editor.isActive('heading', { level: 1 })} 
                    icon={<Heading1 size={16} />} title="Überschrift 1" 
                />
                <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
                    active={editor.isActive('heading', { level: 2 })} 
                    icon={<Heading2 size={16} />} title="Überschrift 2" 
                />
                <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
                    active={editor.isActive('heading', { level: 3 })} 
                    icon={<Heading3 size={16} />} title="Überschrift 3" 
                />
                
                <Sep />
                
                <ToolbarButton 
                    onClick={() => editor.chain().focus().setTextAlign('left').run()} 
                    active={editor.isActive({ textAlign: 'left' })} 
                    icon={<AlignLeft size={16} />} title="Linksbündig" 
                />
                <ToolbarButton 
                    onClick={() => editor.chain().focus().setTextAlign('center').run()} 
                    active={editor.isActive({ textAlign: 'center' })} 
                    icon={<AlignCenter size={16} />} title="Zentriert" 
                />
                <ToolbarButton 
                    onClick={() => editor.chain().focus().setTextAlign('right').run()} 
                    active={editor.isActive({ textAlign: 'right' })} 
                    icon={<AlignRight size={16} />} title="Rechtsbündig" 
                />
                
                <Sep />
                
                <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleBulletList().run()} 
                    active={editor.isActive('bulletList')} 
                    icon={<List size={16} />} title="Liste" 
                />
                <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleOrderedList().run()} 
                    active={editor.isActive('orderedList')} 
                    icon={<ListOrdered size={16} />} title="Nummerierte Liste" 
                />
                <ToolbarButton 
                    onClick={() => editor.chain().focus().toggleBlockquote().run()} 
                    active={editor.isActive('blockquote')} 
                    icon={<Quote size={16} />} title="Zitat" 
                />

                <Sep />

                <ToolbarButton 
                    onClick={addImage} 
                    icon={<ImageIcon size={16} />} title="Bild einfügen" 
                />
                <input
                    type="color"
                    onInput={(event: any) => editor.chain().focus().setColor(event.target.value).run()}
                    value={editor.getAttributes('textStyle').color || '#000000'}
                    data-testid="setColor"
                    className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
                    title="Textfarbe"
                />
                
                <div className="flex-1" />
                
                <ToolbarButton 
                    onClick={toggleFullscreen} 
                    icon={isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />} 
                    title={isExpanded ? "Verkleinern" : "Vollbild"} 
                />
            </div>

            {/* Editor Area */}
            <div className={cn("overflow-auto flex-1 bg-white dark:bg-gray-950", isExpanded && "p-8")}>
                <EditorContent editor={editor} />
            </div>
            
            {isExpanded && (
                <div className="bg-primary/5 text-[10px] text-primary/60 px-4 py-1 border-t dark:border-gray-700 flex justify-between">
                    <span>Vollbild Editor Modus</span>
                    <button onClick={toggleFullscreen} className="hover:underline">Vollbild verlassen</button>
                </div>
            )}
        </div>
    );
}

function Sep() {
    return <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />;
}

function ToolbarButton({ onClick, icon, title, active }: { onClick: () => void, icon: React.ReactNode, title: string, active?: boolean }) {
    return (
        <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
            className={cn(
                "p-1.5 rounded transition-colors",
                active 
                    ? "bg-primary text-black font-bold" 
                    : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            )}
            title={title}
        >
            {icon}
        </button>
    );
}
