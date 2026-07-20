import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

interface EmojiListProps {
  items: any[];
  command: (item: any) => void;
}

export const EmojiList = forwardRef((props: EmojiListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }

      if (event.key === 'Enter') {
        const item = props.items[selectedIndex];
        if (item) {
          props.command(item);
        }
        return true;
      }

      return false;
    },
  }));

  if (props.items.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-[#1a1a24] border border-black/10 dark:border-white/10 rounded-xl shadow-xl overflow-hidden py-1 w-64 max-h-64 overflow-y-auto">
      {props.items.map((item, index) => (
        <button
          key={index}
          onClick={() => props.command(item)}
          className={`w-full text-left px-3 py-2 text-sm flex items-center space-x-3 transition-colors ${
            index === selectedIndex
              ? 'bg-black/5 dark:bg-white/10 text-neutral-900 dark:text-white'
              : 'text-neutral-700 dark:text-neutral-300 hover:bg-black/[0.02] dark:hover:bg-white/5'
          }`}
        >
          {item.fallbackImage ? (
            <img src={item.fallbackImage} alt={item.name} className="w-5 h-5 object-contain" />
          ) : (
            <span className="text-lg">{item.emoji}</span>
          )}
          <span className="truncate flex-1">{item.name}</span>
        </button>
      ))}
    </div>
  );
});

EmojiList.displayName = 'EmojiList';
