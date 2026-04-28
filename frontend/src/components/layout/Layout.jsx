import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, title = 'Tableau de bord' }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header title={title} />
        <main className="page-content animate-fade">
          {children}
        </main>
      </div>
    </div>
  );
}
