import React from 'react';

export const Avatar = ({
  src,
  name = 'User',
  size = 'md',
  isOnline = false,
  showStatus = true,
  className = '',
}) => {
  const sizeMap = {
    xs: { box: 'w-6 h-6 text-[10px]', dot: 'w-2 h-2 border-[1.5px]' },
    sm: { box: 'w-8 h-8 text-xs', dot: 'w-2.5 h-2.5 border-2' },
    md: { box: 'w-10 h-10 text-sm', dot: 'w-3 h-3 border-2' },
    lg: { box: 'w-14 h-14 text-lg', dot: 'w-3.5 h-3.5 border-2' },
    xl: { box: 'w-20 h-20 text-2xl', dot: 'w-4 h-4 border-2' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const getInitials = (n) => {
    if (!n) return 'U';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${currentSize.box} rounded-2xl object-cover bg-slate-800 border border-slate-700/50 shadow-sm`}
          onError={(e) => {
            // Fallback to initials if image fails
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}

      <div
        style={{ display: src ? 'none' : 'flex' }}
        className={`${currentSize.box} rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-sky-500 text-white font-bold items-center justify-center shadow-sm select-none border border-violet-400/20`}
      >
        {getInitials(name)}
      </div>

      {showStatus && isOnline && (
        <span
          className={`absolute bottom-0 right-0 ${currentSize.dot} rounded-full bg-emerald-500 border-white dark:border-[#131622] ring-1 ring-emerald-500/50 animate-pulse`}
          title="Online"
        />
      )}
    </div>
  );
};

export default Avatar;
