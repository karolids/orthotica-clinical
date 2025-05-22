import { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';

export default function Home() {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef(null);

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResponse('');
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: input }),
    });
    const data = await res.json();
    setResponse(data.answer || 'No response from AI.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white text-orthoticaBlack font-sans px-6 py-8">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        <header className="border-b border-orthoticaGray pb-4 text-center">
  <div className="flex justify-center">
    <img src="/orthotica-logo.png" alt="Orthotica Labs" className="h-24 mb-4" />
  </div>
  <h1 className="text-2xl font-bold uppercase text-orthoticaGray">Orthotica Clinical Assistant</h1>
  <p className="text-orthoticaGray">Describe your patient’s condition, and we’ll recommend orthotic or AFO modifications.</p>
</header>

        <div className="bg-gray-100 p-4 rounded-xl border border-orthoticaGray">
          <textarea
            ref={textareaRef}
            rows={1}
            className="w-full text-lg leading-relaxed border border-orthoticaGray rounded-md p-4 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-orthoticaPink"
            placeholder="Enter your clinical question or patient case here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            onClick={handleSubmit}
            className="mt-4 bg-orthoticaPink text-white font-semibold px-6 py-3 rounded-lg hover:bg-pink-400 transition"
            disabled={loading}
          >
            {loading ? 'Thinking...' : 'Submit'}
          </button>
        </div>

        {response && (
          <div
            className="prose prose-lg bg-white border border-orthoticaPink p-6 rounded-xl shadow-sm"
            dangerouslySetInnerHTML={{ __html: marked.parse(response) }}
          />
        )}
      </div>
    </div>
  );
}
