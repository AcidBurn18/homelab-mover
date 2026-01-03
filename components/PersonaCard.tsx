import React from 'react';
import { Persona } from '../types';

interface PersonaCardProps {
  persona: Persona;
  isSelected: boolean;
  onSelect: (persona: Persona) => void;
}

export const PersonaCard: React.FC<PersonaCardProps> = ({ persona, isSelected, onSelect }) => {
  return (
    <button
      onClick={() => onSelect(persona)}
      className={`
        flex items-center gap-3 p-3 rounded-xl border transition-all w-full text-left
        ${isSelected 
          ? `border-${persona.themeColor.replace('bg-', '')} bg-white ring-2 ring-offset-1 ring-${persona.themeColor.replace('bg-', '')}/20 shadow-sm` 
          : 'border-transparent hover:bg-white/50 text-gray-500'}
      `}
    >
      <div className={`w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 ${isSelected ? 'border-current' : 'border-transparent'}`}>
        <img src={persona.avatar} alt={persona.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`text-sm font-semibold truncate ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
          {persona.name}
        </h3>
        <p className="text-xs text-gray-400 truncate">{persona.role}</p>
      </div>
    </button>
  );
};