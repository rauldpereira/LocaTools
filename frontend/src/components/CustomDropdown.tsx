import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import '../styles/CustomDropdown.css';

interface Option {
  value: string | number;
  label: string;
}

interface CustomDropdownProps {
  value: string | number;
  options: Option[];
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  searchable?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, options, onChange, placeholder, className, searchable = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value == value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Limpar a busca toda vez que fechar o dropdown
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
  };

  const filteredOptions = searchable 
    ? options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  return (
    <div className={`custom-dropdown-container ${className || ''}`} ref={dropdownRef}>
      <div 
        className={`custom-dropdown-header ${isOpen ? 'open' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="selected-text">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown size={18} className={`chevron-icon ${isOpen ? 'open' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="custom-dropdown-list">
          {searchable && (
            <div className="custom-dropdown-search-wrapper" onClick={e => e.stopPropagation()}>
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                className="custom-dropdown-search-input"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          )}
          
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div 
                key={option.value} 
                className={`custom-dropdown-item ${value == option.value ? 'selected' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </div>
            ))
          ) : (
            <div className="custom-dropdown-no-results">
              Nenhuma opção encontrada
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;