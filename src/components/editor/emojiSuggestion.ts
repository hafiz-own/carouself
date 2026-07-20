import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import { EmojiList } from './EmojiList';
import React from 'react';

export const emojiSuggestion = {
  items: ({ editor, query }: { editor: any, query: string }) => {
    const defaultShortcodes = ['smile', 'joy', 'heart', 'thumbsup', 'fire', 'sunglasses', 'tada', 'sparkles', 'rocket', 'thinking'];
    
    return editor.storage.emoji.emojis
      .filter(({ name, shortcodes, tags }: any) => {
        if (name.includes('regional_indicator')) return false;

        if (query.length === 0) {
          return shortcodes.some((s: string) => defaultShortcodes.includes(s));
        }

        const q = query.toLowerCase();
        return (
          name.toLowerCase().includes(q) ||
          shortcodes.some((shortcode: string) => shortcode.toLowerCase().includes(q)) ||
          tags.some((tag: string) => tag.toLowerCase().includes(q))
        )
      })
      .slice(0, 10);
  },

  render: () => {
    let component: ReactRenderer;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(EmojiList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: any) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup[0].hide();
          return true;
        }

        return (component.ref as any)?.onKeyDown(props);
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
};
