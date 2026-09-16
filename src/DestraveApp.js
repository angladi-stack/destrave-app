import React, { useState } from 'react';

export const DestraveApp = () => {
  const [activeTab, setActiveTab] = useState('inicio');
  const [mode, setMode] = useState('FACA_POR_MIM');
  const [format, setFormat] = useState('STORIES');
  const [objective, setObjective] = useState('VENDA');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [profile, setProfile] = useState({
    userName: 'Angladi',
    businessName: 'Angladi | Soluções Digitais',
    products: 'Mentoria Destrave, E-books, Protocolo Liso Esmeralda',
    knownObjections: 'Não sei o que falar, tenho vergonha da câmera, não tenho tempo',
    forbiddenExpressions: 'Transforme seus sonhos, oportunidade imperdível'
  });

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          mode,
          format,
          objective
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível gerar o conteúdo.');
      }

      setResult(data.result);
      setActiveTab('conteudo');
    } catch (e) {
      alert(`Erro ao gerar com a IA: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#09090b', color: '#f4f4f5', minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '80px' }}>
      <header style={{ borderBottom: '1px solid #27272a', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000000' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>DESTRAVE</h1>
          <span style={{ fontSize: '11px', color: '#d4af37' }}>by Angladi</span>
        </div>
        <div style={{ fontSize: '12px', color: '#a1a1aa', border: '1px solid #d4af37', padding: '4px 10px', borderRadius: '12px' }}>✦ PRO</div>
      </header>

      <main style={{ padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
        {activeTab === 'inicio' && (
          <div>
            <h2 style={{ fontSize: '22px', color: '#ffffff', marginBottom: '6px' }}>Oi, {profile.userName} ✦</h2>
            <p style={{ fontSize: '14px', color: '#a1a1aa', marginBottom: '20px' }}>
              O Destrave não ensina a fazer conteúdo. Ele destrava o próximo conteúdo que você precisa publicar.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <button onClick={() => setMode('QUERO_SO_A_IDEIA')} style={{ padding: '16px', borderRadius: '12px', border: mode === 'QUERO_SO_A_IDEIA' ? '2px solid #d4af37' : '1px solid #27272a', background: '#18181b', color: '#fff', textAlign: 'left' }}>
                💡 <strong>QUERO SÓ A IDEIA</strong>
              </button>
              <button onClick={() => setMode('FACA_POR_MIM')} style={{ padding: '16px', borderRadius: '12px', border: mode === 'FACA_POR_MIM' ? '2px solid #d4af37' : '1px solid #27272a', background: '#18181b', color: '#fff', textAlign: 'left' }}>
                ✨ <strong>FAÇA POR MIM</strong>
              </button>
            </div>

            <button onClick={handleGenerate} disabled={loading} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #d4af37 0%, #aa7c11 100%)', color: '#000', fontWeight: 'bold', border: 'none' }}>
              {loading ? 'DESTRAVANDO...' : 'DESTRAVAR AGORA ✦'}
            </button>
          </div>
        )}

        {activeTab === 'conteudo' && result && (
          <div>
            <h2 style={{ fontSize: '20px', color: '#fff' }}>{result.title}</h2>
            <div style={{ background: '#18181b', padding: '14px', borderRadius: '12px', margin: '16px 0', border: '1px solid #27272a' }}>
              <div style={{ fontSize: '12px', color: '#ef4444' }}>❌ <strong>Antes:</strong> "{result.fromPerception}"</div>
              <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '6px' }}>✅ <strong>Depois:</strong> "{result.toPerception}"</div>
            </div>
            <div style={{ background: '#121215', border: '1px solid #27272a', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#a1a1aa' }}>🎬 <strong>COMO GRAVAR:</strong></div>
              <div style={{ fontSize: '13px', color: '#d4d4d8', marginBottom: '12px' }}>{result.howToRecord}</div>
              <div style={{ fontSize: '11px', color: '#d4af37' }}>🗣️ <strong>O QUE FALAR (TELEPROMPTER):</strong></div>
              <div style={{ fontSize: '14px', color: '#ffffff', fontStyle: 'italic', marginTop: '4px' }}>"{result.whatToSay}"</div>
            </div>
          </div>
        )}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '64px', background: '#000000', borderTop: '1px solid #27272a', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        <button onClick={() => setActiveTab('inicio')} style={{ background: 'none', border: 'none', color: activeTab === 'inicio' ? '#d4af37' : '#71717a' }}>✦ Início</button>
        <button onClick={() => setActiveTab('conteudo')} style={{ background: 'none', border: 'none', color: activeTab === 'conteudo' ? '#d4af37' : '#71717a' }}>📝 Conteúdo</button>
      </nav>
    </div>
  );
};

export default DestraveApp;
