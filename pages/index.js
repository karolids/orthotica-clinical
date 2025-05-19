import { useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');

  async function handleSubmit() {
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input })
    });
    const data = await res.json();
    setResponse(data.answer);
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Orthotica AI Assistant</h1>
      <textarea
        rows='4'
        cols='60'
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='Enter a patient case...'
      />
      <br />
      <button onClick={handleSubmit}>Submit</button>
      <pre>{response}</pre>
    </div>
  );
}
