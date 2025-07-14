import React from 'react';

interface SimpleLayoutProps {
    children: React.ReactNode;
}

const SimpleLayout: React.FC<SimpleLayoutProps> = ({ children }) => {
    console.log('SimpleLayout rendering...');

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f3f4f6',
            padding: '20px'
        }}>
            <nav style={{
                backgroundColor: 'white',
                padding: '16px',
                marginBottom: '20px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                    CQRS CMS - 简化版
                </h1>
            </nav>

            <main style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                {children}
            </main>
        </div>
    );
};

export default SimpleLayout;
