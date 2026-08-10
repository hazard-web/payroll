import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function GlobalSearch({ portal = 'admin' }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}&portal=${portal}`);
        setResults(res.data.data || []);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, portal]);

  const handleSelect = (link) => {
    setIsOpen(false);
    setQuery('');
    let targetLink = link;
    if (link.startsWith('/staff/') && window.location.pathname.startsWith('/performance')) {
      const staffId = link.replace('/staff/', '');
      targetLink = `/performance/${staffId}`;
    }
    navigate(targetLink);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: 220 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: portal === 'admin' ? 10 : 12,
          height: portal === 'admin' ? 38 : 40,
          padding: '0 12px',
          gap: 8,
          transition: 'border-color 0.2s',
          ...(isOpen ? { borderColor: 'var(--primary)' } : {})
        }}
      >
        <Search size={14} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 12,
            color: 'var(--text)',
            width: '100%',
          }}
        />
        {isLoading && <Loader2 size={12} className="animate-spin" color="var(--primary)" />}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            maxHeight: 350,
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {results.length === 0 && !isLoading ? (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              No results found for "{query}"
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {results.map((r, i) => (
                <div
                  key={`${r.id}-${i}`}
                  onClick={() => handleSelect(r.link)}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-alt)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                      {r.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        color: 'var(--text-muted)'
                      }}
                    >
                      {r.type}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.subtitle}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
