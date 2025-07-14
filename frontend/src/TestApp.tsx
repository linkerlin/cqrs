import React from 'react';

const TestApp: React.FC = () => {
    console.log('TestApp rendering...');

    return (
        <div style={{
            padding: '20px',
            backgroundColor: 'lightblue',
            minHeight: '100vh',
            color: 'black'
        }}>
            <h1>测试页面</h1>
            <p>如果您能看到这个页面，说明React基本功能正常。</p>
            <div>
                <h2>诊断信息:</h2>
                <ul>
                    <li>React: {React.version}</li>
                    <li>当前时间: {new Date().toLocaleString()}</li>
                    <li>User Agent: {navigator.userAgent}</li>
                </ul>
            </div>
        </div>
    );
};

export default TestApp;
