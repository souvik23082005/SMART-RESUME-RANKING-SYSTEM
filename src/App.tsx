import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import JDPage from './pages/JDPage';
import ResumesPage from './pages/ResumesPage';
import RankingConfigPage from './pages/RankingConfigPage';
import ResultsPage from './pages/ResultsPage';

function AppContent() {
  const { step } = useApp();
  return (
    <Layout>
      {step === 'jd' && <JDPage />}
      {step === 'resumes' && <ResumesPage />}
      {step === 'config' && <RankingConfigPage />}
      {step === 'results' && <ResultsPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
