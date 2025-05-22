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
    <div className="min-h-screen bg-white text-gray-900 font-sans px-4 py-6">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <header className="border-b pb-4">
          <img src="/orthotica-logo.png" alt="Orthotica Labs" className="h-12 mb-2" />
          <h1 className="text-2xl font-bold">Orthotica Clinical Assistant</h1>
          <p className="text-gray-600">Describe your patient’s condition, and we’ll recommend orthotic or AFO modifications.</p>
        </header>

        <div>
          <textarea
            ref={textareaRef}
            rows={1}
            className="block w-full text-lg leading-relaxed border border-gray-300 rounded-lg p-4 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your clinical question or patient case here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            onClick={handleSubmit}
            className="mt-4 bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading ? 'Thinking...' : 'Submit'}
          </button>
        </div>

        {response && (
          <div
            className="prose prose-lg bg-gray-50 border border-gray-200 p-6 rounded-lg"
            dangerouslySetInnerHTML={{ __html: marked.parse(response) }}
          />
        )}
      </div>
    </div>
  );
}
