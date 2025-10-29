import React, { useEffect, useRef, useState } from 'react';

const Fifths: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Load the HTML content
    fetch('/src/fifths/fifths.html')
      .then(response => response.text())
      .then(html => {
        setHtmlContent(html);
      })
      .catch(error => {
        console.error('Error loading fifths.html:', error);
      });

    // Load CSS once
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/src/fifths/fifths.css';
    document.head.appendChild(link);
  }, []);

  // Load and execute JS after HTML is rendered
  useEffect(() => {
    if (!htmlContent || scriptLoadedRef.current || !containerRef.current) return;
    
    // Wait for React to render the HTML
    const timer = setTimeout(() => {
      if (containerRef.current && !scriptLoadedRef.current) {
        scriptLoadedRef.current = true;
        
        // Load and execute the JS
        const script = document.createElement('script');
        script.src = '/src/fifths/fifths.js';
        script.type = 'text/javascript';
        script.async = true;
        
        script.onload = () => {
          console.log('Fifths script loaded successfully');
        };
        
        script.onerror = (error) => {
          console.error('Error loading fifths.js:', error);
        };
        
        document.body.appendChild(script);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [htmlContent]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100vh',
        overflow: 'auto',
        backgroundColor: '#A9B9D7'
      }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default Fifths;
