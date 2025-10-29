import React, { useEffect, useRef, useState } from 'react';

const Fifths: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    // Load the HTML content
    fetch('/src/fifths/fifths.html')
      .then(response => response.text())
      .then(html => {
        setHtmlContent(html);
        
        // Load and execute the CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/src/fifths/fifths.css';
        document.head.appendChild(link);

        // Load and execute the JS
        const script = document.createElement('script');
        script.src = '/src/fifths/fifths.js';
        script.type = 'text/javascript';
        document.body.appendChild(script);
      })
      .catch(error => {
        console.error('Error loading fifths.html:', error);
      });
  }, []);

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
