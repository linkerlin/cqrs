import React from 'react';

const SimpleArticleList: React.FC = () => {
    console.log('SimpleArticleList rendering...');

    return (
        <div>
            <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 'bold' }}>
                文章列表 - 简化版
            </h2>

            <div style={{
                backgroundColor: '#f9fafb',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
            }}>
                <p>这是一个简化的文章列表页面。</p>
                <p>如果您能看到这个页面，说明基本的路由和组件渲染都正常。</p>
                <ul style={{ marginTop: '16px' }}>
                    <li>React路由: ✅ 正常</li>
                    <li>组件渲染: ✅ 正常</li>
                    <li>CSS样式: ✅ 正常</li>
                </ul>
            </div>
        </div>
    );
};

export default SimpleArticleList;
